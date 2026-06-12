// backend/src/routes/invitations.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { emailLimiter } from '../middleware/rateLimiter.js';
import crypto from 'crypto';
import { sendTripInvitation } from '../services/emailService.js';
import { logger } from '../services/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

// ========================================
// INVITATIONS
// ========================================

/**
 * POST /api/trips/:tripId/invitations
 * Send invitations to join a trip
 * Rate limited: 3 emails per hour
 */
router.post('/:tripId/invitations', emailLimiter, authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { tripId } = req.params;
    const { emails, message } = req.body;

    // Log user action
    logger.logUserAction({
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      action: 'Send Trip Invitations',
      details: {
        tripId,
        emailCount: emails?.length || 0,
        hasCustomMessage: !!message
      }
    });

    // Validate emails
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'At least one email is required' });
    }

    // Find trip
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
        invitations: {
          where: {
            status: 'pending',
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if user can invite (creator or organizer)
    const isCreator = trip.creatorId === user.id;
    const isOrganizer = trip.members.some(
      (m) => m.userId === user.id && m.role === 'organizer'
    );

    if (!isCreator && !isOrganizer) {
      return res.status(403).json({ error: 'Only trip creator or organizers can send invitations' });
    }

    // Check if trip has reached max members
    const currentMemberCount = trip.members.length;
    if (currentMemberCount + emails.length > trip.maxMembers) {
      return res.status(400).json({
        error: `Cannot invite ${emails.length} people. Trip has ${currentMemberCount}/${trip.maxMembers} members.`,
      });
    }

    // Create invitations
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to respond

    const createdInvitations = [];
    const errors = [];

    for (const email of emails) {
      const trimmedEmail = email.trim().toLowerCase();

      // Check if email is valid
      if (!trimmedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push({ email, reason: 'Invalid email format' });
        continue;
      }

      // In development, allow self-invitation for testing (Resend sandbox requires verified emails)
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const isSelfInvite = trimmedEmail === user.email.toLowerCase();

      if (isSelfInvite) {
        if (isDevelopment) {
          console.log('🧪 DEV MODE: Allowing self-invitation for testing (Resend sandbox)');
        } else {
          errors.push({ email: trimmedEmail, reason: 'Cannot invite yourself' });
          continue;
        }
      }

      // Check if user is already a member
      const isAlreadyMember = trip.members.some(
        (m) => m.user?.email === trimmedEmail || m.guestEmail === trimmedEmail
      );
      if (isAlreadyMember) {
        errors.push({ email: trimmedEmail, reason: 'Already a member' });
        continue;
      }

      // Check if there's already a pending invitation
      const existingInvitation = trip.invitations.find(
        (inv) => inv.email === trimmedEmail && inv.status === 'pending'
      );
      if (existingInvitation) {
        errors.push({ email: trimmedEmail, reason: 'Invitation already sent' });
        continue;
      }

      // Create invitation
      try {
        const invitation = await prisma.tripInvitation.create({
          data: {
            tripId,
            email: trimmedEmail,
            invitedBy: user.id,
            message: message || null,
            status: 'pending',
            expiresAt,
            token: crypto.randomBytes(32).toString('hex'),
          },
          include: {
            inviter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                imageUrl: true,
              },
            },
            trip: {
              select: {
                id: true,
                name: true,
                coverImageUrl: true,
              },
            },
          },
        });

        createdInvitations.push(invitation);

        // Send invitation email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const acceptUrl = `${frontendUrl}/accept-invitation/${invitation.token}`;

        const inviterName = user.firstName
          ? `${user.firstName} ${user.lastName || ''}`.trim()
          : user.email;

        const emailResult = await sendTripInvitation({
          to: trimmedEmail,
          tripName: trip.name,
          inviterName,
          acceptUrl,
          message: message || null,
        });

        // Log email result
        logger.logEmail({
          type: 'Trip Invitation',
          recipient: trimmedEmail,
          status: emailResult.success ? 'success' : 'failed',
          error: emailResult.error || null,
          emailId: emailResult.data?.id || null,
        });

        console.log(`📧 Invitation email sent to ${trimmedEmail}`);
      } catch (error) {
        console.error(`Error creating invitation for ${trimmedEmail}:`, error);
        errors.push({ email: trimmedEmail, reason: 'Failed to create invitation' });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        invitations: createdInvitations,
        summary: {
          sent: createdInvitations.length,
          failed: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('Error sending invitations:', error);
    res.status(500).json({ error: 'Failed to send invitations' });
  }
});

/**
 * GET /api/invitations/:token/details
 * Get invitation details (public endpoint - no auth required)
 */
router.get('/:token/details', async (req, res) => {
  try {
    const { token } = req.params;

    // Find invitation
    const invitation = await prisma.tripInvitation.findUnique({
      where: { token },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        trip: {
          select: {
            id: true,
            name: true,
            coverImageUrl: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation already ${invitation.status}` });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    res.json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    console.error('Error fetching invitation details:', error);
    res.status(500).json({ error: 'Failed to fetch invitation details' });
  }
});

/**
 * POST /api/invitations/:token/accept
 * Accept a trip invitation (can be done by guest without account)
 */
router.post('/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { guestName } = req.body;

    // Find invitation
    const invitation = await prisma.tripInvitation.findUnique({
      where: { token },
      include: {
        trip: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation already responded to' });
    }

    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await prisma.tripInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Check if trip has reached max members
    if (invitation.trip.members.length >= invitation.trip.maxMembers) {
      return res.status(400).json({ error: 'Trip has reached maximum number of members' });
    }

    // Check if user is authenticated (signed in with Clerk)
    let authenticatedUser = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const authToken = authHeader.substring(7);
        const sessionClaims = await clerkClient.verifyToken(authToken);

        if (sessionClaims && sessionClaims.sub) {
          const clerkId = sessionClaims.sub;

          // Try to find existing user
          authenticatedUser = await prisma.user.findUnique({
            where: { clerkId },
          });

          // If user doesn't exist, create them (sync from Clerk)
          if (!authenticatedUser) {
            const clerkUser = await clerkClient.users.getUser(clerkId);
            const email = clerkUser.emailAddresses[0]?.emailAddress || '';

            // Check if user exists with same email but different clerkId
            const existingUserByEmail = await prisma.user.findUnique({
              where: { email },
            });

            if (existingUserByEmail) {
              // Update existing user with new clerkId
              authenticatedUser = await prisma.user.update({
                where: { email },
                data: {
                  clerkId,
                  firstName: clerkUser.firstName || existingUserByEmail.firstName,
                  lastName: clerkUser.lastName || existingUserByEmail.lastName,
                  imageUrl: clerkUser.imageUrl || existingUserByEmail.imageUrl,
                },
              });
              console.log('✅ User synced for invitation acceptance:', authenticatedUser.email);
            } else {
              // Create new user
              authenticatedUser = await prisma.user.create({
                data: {
                  clerkId,
                  email,
                  firstName: clerkUser.firstName,
                  lastName: clerkUser.lastName,
                  imageUrl: clerkUser.imageUrl,
                },
              });
              console.log('✅ New user created for invitation acceptance:', authenticatedUser.email);
            }
          }
        }
      } catch (authError) {
        console.log('⚠️ Auth token verification failed:', authError.message);
        // Continue without authenticated user (guest mode)
      }
    }

    // Check if user is already a member
    if (authenticatedUser) {
      const isAlreadyMember = invitation.trip.members.some(
        (m) => m.userId === authenticatedUser.id
      );
      if (isAlreadyMember) {
        return res.status(400).json({ error: 'You are already a member of this trip' });
      }
    }

    let member;

    if (authenticatedUser) {
      // Authenticated user - create member with userId
      member = await prisma.tripMember.create({
        data: {
          tripId: invitation.tripId,
          userId: authenticatedUser.id,
          role: 'member',
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              imageUrl: true,
            },
          },
        },
      });
      console.log(`✅ Member added to trip: ${authenticatedUser.email}`);
    } else {
      // Guest mode - create member without userId, with session token for chat access
      if (!guestName || guestName.trim().length === 0) {
        return res.status(400).json({ error: 'Indiquez votre prénom pour rejoindre le voyage' });
      }

      // Generate a unique session token for guest WebSocket authentication
      const sessionToken = crypto.randomBytes(32).toString('hex');

      member = await prisma.tripMember.create({
        data: {
          tripId: invitation.tripId,
          guestEmail: invitation.email,
          guestName: guestName.trim(),
          role: 'guest',
          sessionToken,
        },
      });
      console.log(`✅ Guest member added to trip: ${guestName} (session: ${sessionToken.substring(0, 8)}...)`);
    }

    // Update invitation status
    await prisma.tripInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        respondedAt: new Date(),
      },
    });

    // Create system message
    await prisma.tripMessage.create({
      data: {
        tripId: invitation.tripId,
        content: authenticatedUser
          ? `${authenticatedUser.firstName || authenticatedUser.email} a rejoint le voyage`
          : `${guestName} a rejoint le voyage`,
        type: 'system',
      },
    });

    // Log user action and workflow
    logger.logUserAction({
      userId: authenticatedUser?.id || 'guest',
      userName: authenticatedUser?.firstName || guestName,
      action: 'Accept Trip Invitation',
      details: {
        tripId: invitation.tripId,
        tripName: invitation.trip.name,
        isGuest: !authenticatedUser,
        email: invitation.email
      }
    });

    logger.logWorkflow({
      tripId: invitation.tripId,
      tripName: invitation.trip.name,
      fromState: 'invited',
      toState: 'member',
      triggeredBy: authenticatedUser?.email || guestName,
      memberCount: invitation.trip.members.length + 1
    });

    res.json({
      success: true,
      data: {
        member,
        trip: invitation.trip,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

/**
 * POST /api/invitations/:token/decline
 * Decline a trip invitation
 */
router.post('/:token/decline', async (req, res) => {
  try {
    const { token } = req.params;

    // Find invitation
    const invitation = await prisma.tripInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation already responded to' });
    }

    // Update invitation status
    await prisma.tripInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'declined',
        respondedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Invitation declined',
    });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
});

/**
 * DELETE /api/trips/:tripId/invitations/:invitationId
 * Cancel an invitation (creator/organizer only)
 */
router.delete('/:tripId/invitations/:invitationId', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { tripId, invitationId } = req.params;

    // Find trip
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if user can cancel invitations
    const isCreator = trip.creatorId === user.id;
    const isOrganizer = trip.members.some(
      (m) => m.userId === user.id && m.role === 'organizer'
    );

    if (!isCreator && !isOrganizer) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete invitation
    await prisma.tripInvitation.delete({
      where: {
        id: invitationId,
        tripId, // Ensure invitation belongs to this trip
      },
    });

    res.json({
      success: true,
      message: 'Invitation cancelled',
    });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

export default router;
