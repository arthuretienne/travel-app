// backend/src/routes/trips.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// ========================================
// COLLABORATIVE TRIPS CRUD
// ========================================

/**
 * GET /api/trips
 * List all collaborative trips for the authenticated user
 * Returns: created trips, trips where user is a member, and pending invitations
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware

    // Get trips where user is creator
    const createdTrips = await prisma.collaborativeTrip.findMany({
      where: {
        creatorId: user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        members: {
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
        },
        _count: {
          select: {
            members: true,
            proposedTrips: true,
            votes: true,
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Get trips where user is a member
    const memberTrips = await prisma.collaborativeTrip.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
            role: {
              in: ['member', 'organizer'],
            },
          },
        },
        creatorId: {
          not: user.id, // Exclude trips already in createdTrips
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        members: {
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
        },
        _count: {
          select: {
            members: true,
            proposedTrips: true,
            votes: true,
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Get pending invitations
    const pendingInvitations = await prisma.tripInvitation.findMany({
      where: {
        email: user.email,
        status: 'pending',
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        trip: {
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                imageUrl: true,
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        createdTrips,
        memberTrips,
        pendingInvitations,
        summary: {
          totalCreated: createdTrips.length,
          totalMember: memberTrips.length,
          totalInvitations: pendingInvitations.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching collaborative trips:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

/**
 * GET /api/trips/:id
 * Get detailed information about a specific collaborative trip
 */
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { id } = req.params;

    // Get trip with full details
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        members: {
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
          orderBy: {
            joinedAt: 'asc',
          },
        },
        invitations: {
          where: {
            status: 'pending',
            expiresAt: {
              gte: new Date(),
            },
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
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        proposedTrips: {
          include: {
            proposer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                imageUrl: true,
              },
            },
            votes: {
              include: {
                voter: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        votes: {
          include: {
            voter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                imageUrl: true,
              },
            },
            destination: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                imageUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 50, // Limit to last 50 messages
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if user has access to this trip
    const isMember = trip.members.some((m) => m.userId === user.id);
    const isCreator = trip.creatorId === user.id;
    const hasInvitation = await prisma.tripInvitation.findFirst({
      where: {
        tripId: id,
        email: user.email,
        status: 'pending',
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!isMember && !isCreator && !hasInvitation) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get user's role in this trip
    const userMembership = trip.members.find((m) => m.userId === user.id);
    const userRole = isCreator ? 'creator' : userMembership?.role || 'guest';

    res.json({
      success: true,
      data: {
        trip,
        userRole,
        permissions: {
          canInvite: isCreator || userRole === 'organizer',
          canPropose: isMember || isCreator,
          canVote: isMember || isCreator,
          canEditSettings: isCreator,
          canSendMessages: isMember || isCreator,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching trip details:', error);
    res.status(500).json({ error: 'Failed to fetch trip details' });
  }
});

/**
 * POST /api/trips
 * Create a new collaborative trip from scratch
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { name, coverImageUrl, maxMembers, requireAllVotes } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Trip name is required' });
    }

    // Create trip
    const trip = await prisma.collaborativeTrip.create({
      data: {
        name: name.trim(),
        coverImageUrl: coverImageUrl || null,
        creatorId: user.id,
        status: 'draft',
        maxMembers: maxMembers || 8,
        requireAllVotes: requireAllVotes || false,
        members: {
          create: {
            userId: user.id,
            role: 'organizer',
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        members: {
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
        },
      },
    });

    res.status(201).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    console.error('Error creating collaborative trip:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

/**
 * POST /api/trips/from-saved/:savedTripId
 * Convert a saved solo trip into a collaborative trip
 */
router.post('/from-saved/:savedTripId', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { savedTripId } = req.params;
    const { name, coverImageUrl, maxMembers, requireAllVotes } = req.body;

    // Find the saved trip
    const savedTrip = await prisma.savedTrip.findUnique({
      where: { id: savedTripId },
    });

    if (!savedTrip) {
      return res.status(404).json({ error: 'Saved trip not found' });
    }

    // Verify ownership
    if (savedTrip.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create collaborative trip
    const collaborativeTrip = await prisma.collaborativeTrip.create({
      data: {
        name: name || `${savedTrip.city} Trip`,
        coverImageUrl: coverImageUrl || null,
        creatorId: user.id,
        status: 'draft',
        maxMembers: maxMembers || 8,
        requireAllVotes: requireAllVotes || false,
        originSavedTripId: savedTripId,
        members: {
          create: {
            userId: user.id,
            role: 'organizer',
          },
        },
        proposedTrips: {
          create: {
            proposedBy: user.id,
            savedTripId: savedTripId,
            city: savedTrip.city,
            country: savedTrip.country,
            startDate: savedTrip.startDate,
            endDate: savedTrip.endDate,
            duration: Math.ceil(
              (savedTrip.endDate - savedTrip.startDate) / (1000 * 60 * 60 * 24)
            ),
            estimatedCostPerPerson:
              (savedTrip.tripData?.totalPrice || 0) / 1, // Assume 1 person for now
            tripData: savedTrip.tripData,
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        members: {
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
        },
        proposedTrips: {
          include: {
            proposer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    // Link saved trip to collaborative trip
    await prisma.savedTrip.update({
      where: { id: savedTripId },
      data: {
        collaborativeTripId: collaborativeTrip.id,
      },
    });

    res.status(201).json({
      success: true,
      data: collaborativeTrip,
    });
  } catch (error) {
    console.error('Error converting saved trip to collaborative:', error);
    res.status(500).json({ error: 'Failed to convert trip' });
  }
});

/**
 * PATCH /api/trips/:id
 * Update trip settings (name, cover image, max members, etc.)
 */
router.patch('/:id', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { id } = req.params;
    const { name, coverImageUrl, maxMembers, requireAllVotes, status, voteDeadline } = req.body;

    // Find trip
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Only creator can update trip settings
    if (trip.creatorId !== user.id) {
      return res.status(403).json({ error: 'Only the trip creator can update settings' });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl;
    if (maxMembers !== undefined) updateData.maxMembers = maxMembers;
    if (requireAllVotes !== undefined) updateData.requireAllVotes = requireAllVotes;
    if (status !== undefined) updateData.status = status;
    if (voteDeadline !== undefined) updateData.voteDeadline = voteDeadline ? new Date(voteDeadline) : null;

    // Update trip
    const updatedTrip = await prisma.collaborativeTrip.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        members: {
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
        },
      },
    });

    res.json({
      success: true,
      data: updatedTrip,
    });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});

/**
 * DELETE /api/trips/:id
 * Delete a collaborative trip (creator only)
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { id } = req.params;

    // Find trip
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Only creator can delete trip
    if (trip.creatorId !== user.id) {
      return res.status(403).json({ error: 'Only the trip creator can delete the trip' });
    }

    // Delete trip (cascade will handle related records)
    await prisma.collaborativeTrip.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Trip deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

export default router;
