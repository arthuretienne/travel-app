// backend/src/routes/invitations.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// ========================================
// INVITATIONS
// ========================================

/**
 * POST /api/trips/:tripId/invitations
 * Send invitations to join a trip
 */
router.post('/:tripId/invitations', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { tripId } = req.params;
    const { emails, message } = req.body;

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

        // TODO: Send email notification via SendGrid
        console.log(`📧 TODO: Send invitation email to ${trimmedEmail}`);
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

    // Check if user has an account
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    let member;

    if (existingUser) {
      // User has account - create member with userId
      member = await prisma.tripMember.create({
        data: {
          tripId: invitation.tripId,
          userId: existingUser.id,
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
    } else {
      // Guest mode - create member without userId
      if (!guestName || guestName.trim().length === 0) {
        return res.status(400).json({ error: 'Guest name is required' });
      }

      member = await prisma.tripMember.create({
        data: {
          tripId: invitation.tripId,
          guestEmail: invitation.email,
          guestName: guestName.trim(),
          role: 'guest',
        },
      });
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
        content: existingUser
          ? `${existingUser.firstName || existingUser.email} joined the trip`
          : `${guestName} joined the trip`,
        type: 'system',
      },
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
