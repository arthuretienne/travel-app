// backend/src/routes/trips.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/auth.js';
import { checkLimit, incrementUsage, requireFeature } from '../middleware/checkSubscription.js';
import { sendBookingReminder } from '../services/emailService.js';

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
 * GET /api/trips/:id/group-preferences
 * Get aggregated preferences from all members of the trip
 */
router.get('/:id/group-preferences', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    // Get trip with members
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check access
    const isMember = trip.members.some((m) => m.userId === user.id);
    const isCreator = trip.creatorId === user.id;

    if (!isMember && !isCreator) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all member user IDs (filter out null for guest members)
    const memberUserIds = trip.members
      .map((m) => m.userId)
      .filter((id) => id !== null);
    if (isCreator && !memberUserIds.includes(user.id)) {
      memberUserIds.push(user.id);
    }

    // Fetch preferences for all members (only registered users have preferences)
    const userPreferences = await prisma.userPreferences.findMany({
      where: {
        userId: {
          in: memberUserIds,
        },
      },
    });

    // Calculate availability aggregation
    const availability = calculateGroupAvailability(userPreferences);

    // Handle case where no preferences exist yet
    const hasPreferences = userPreferences.length > 0;

    // Aggregate preferences
    const aggregated = {
      memberCount: memberUserIds.length,
      budget: hasPreferences ? {
        min: Math.min(...userPreferences.map(p => p.budget || 1500)),
        max: Math.max(...userPreferences.map(p => p.budget || 1500)),
        average: Math.round(userPreferences.reduce((sum, p) => sum + (p.budget || 1500), 0) / userPreferences.length),
      } : {
        min: 1500,
        max: 1500,
        average: 1500,
      },
      travelStyles: hasPreferences ? getMostCommon(userPreferences.map(p => p.travelStyle)) : ['cultural'],
      activities: hasPreferences ? getMostCommon(userPreferences.flatMap(p => p.activities || [])) : [],
      maxFlightHours: hasPreferences ? Math.min(...userPreferences.map(p => p.maxFlightHours || 12)) : 12,
      defaultTravelers: trip.members.length + 1, // Members + creator
      availability,
    };

    res.json({
      success: true,
      data: aggregated,
    });
  } catch (error) {
    console.error('Error aggregating group preferences:', error);
    res.status(500).json({ error: 'Failed to aggregate preferences' });
  }
});

// Helper function to get most common items
function getMostCommon(arr) {
  if (!arr || arr.length === 0) return [];

  const counts = {};
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([item]) => item);
}

// Helper function to calculate group availability
function calculateGroupAvailability(userPreferences) {
  // Count how many people have calendar connected
  const calendarsConnected = userPreferences.filter(p => p.calendarConnected).length;
  const totalMembers = userPreferences.length;

  // Calculate average trip duration preference
  const avgTripDurations = userPreferences.filter(p => p.avgTripDuration).map(p => p.avgTripDuration);
  const recommendedDuration = avgTripDurations.length > 0
    ? Math.round(avgTripDurations.reduce((sum, d) => sum + d, 0) / avgTripDurations.length)
    : 7;

  // Calculate minimum available leave days (most restrictive)
  const leaveDaysData = userPreferences.filter(p => p.annualLeaveDays && p.takenLeaveDays !== null);
  const minAvailableDays = leaveDaysData.length > 0
    ? Math.min(...leaveDaysData.map(p => (p.annualLeaveDays || 25) - (p.takenLeaveDays || 0)))
    : null;

  // Get most common departure flexibility
  const flexibilityPrefs = userPreferences.filter(p => p.departureFlexibility).map(p => p.departureFlexibility);
  const mostCommonFlexibility = flexibilityPrefs.length > 0
    ? getMostCommon(flexibilityPrefs)[0]
    : 'flexible';

  // Get most common preferred months (if any)
  const allPreferredMonths = userPreferences.flatMap(p => p.preferredMonths || []);
  const commonMonths = getMostCommon(allPreferredMonths).slice(0, 3);

  // Determine availability status
  let availabilityStatus;
  let availabilityMessage;

  if (calendarsConnected === totalMembers) {
    availabilityStatus = 'all_connected';
    availabilityMessage = 'All members have calendar connected - optimal scheduling possible';
  } else if (calendarsConnected > 0) {
    availabilityStatus = 'partial_connected';
    availabilityMessage = `${calendarsConnected}/${totalMembers} members have calendar connected`;
  } else {
    availabilityStatus = 'manual';
    availabilityMessage = 'Manual scheduling - members will coordinate dates during voting';
  }

  return {
    calendarsConnected,
    totalMembers,
    availabilityStatus,
    availabilityMessage,
    recommendedDuration,
    minAvailableLeaveDays: minAvailableDays,
    departureFlexibility: mostCommonFlexibility,
    preferredMonths: commonMonths,
    // Flag to indicate if AI can suggest optimal dates
    canSuggestDates: calendarsConnected >= Math.ceil(totalMembers / 2) || minAvailableDays !== null,
  };
}

/**
 * POST /api/trips
 * Create a new collaborative trip from scratch
 * Requires collaborative voting feature and checks group trip limits
 */
router.post('/',
  authenticateUser,
  requireFeature('collaborativeVoting'),
  checkLimit('maxGroupTrips', 'groupTripsCreated'),
  incrementUsage('groupTripsCreated'),
  async (req, res) => {
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
 * Requires collaborative voting feature and checks group trip limits
 */
router.post('/from-saved/:savedTripId',
  authenticateUser,
  requireFeature('collaborativeVoting'),
  checkLimit('maxGroupTrips', 'groupTripsCreated'),
  incrementUsage('groupTripsCreated'),
  async (req, res) => {
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

/**
 * POST /api/trips/:id/reminders
 * Send booking reminder emails to members who haven't completed their bookings
 */
router.post('/:id/reminders', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { memberIds } = req.body; // Optional: specific members to remind

    // Get trip with members and final destination
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if user is creator or organizer
    const userMember = trip.members.find(m => m.userId === user.id);
    const isCreator = trip.creatorId === user.id;
    const isOrganizer = userMember?.role === 'organizer';

    if (!isCreator && !isOrganizer) {
      return res.status(403).json({ error: 'Only trip creator or organizers can send reminders' });
    }

    // Check if trip has a confirmed destination
    if (!trip.finalDestination) {
      return res.status(400).json({ error: 'Trip must have a confirmed destination to send reminders' });
    }

    const destCity = trip.finalDestination.city || trip.finalDestination.destination?.city || 'Unknown';
    const destCountry = trip.finalDestination.country || trip.finalDestination.destination?.country || '';
    const destination = `${destCity}, ${destCountry}`;
    const senderName = `${user.firstName || 'Un membre'} ${user.lastName || ''}`.trim();
    const tripUrl = `${process.env.FRONTEND_URL || 'https://skusku.life'}/trip/${trip.id}`;

    // Find members who need reminders
    let membersToRemind = trip.members.filter(m => {
      // Skip the sender
      if (m.userId === user.id) return false;
      // If specific memberIds provided, filter by them
      if (memberIds && memberIds.length > 0) {
        return memberIds.includes(m.id);
      }
      // Otherwise, include members who haven't completed booking
      return !m.hasBookedFlight || !m.hasBookedHotel;
    });

    if (membersToRemind.length === 0) {
      return res.json({
        success: true,
        message: 'No members need reminders - everyone has completed their bookings!',
        sentCount: 0,
      });
    }

    // Send reminders
    const results = await Promise.all(
      membersToRemind.map(async (member) => {
        if (!member.user?.email) {
          return { memberId: member.id, success: false, error: 'No email address' };
        }

        const missingBookings = [];
        if (!member.hasBookedFlight) missingBookings.push('flight');
        if (!member.hasBookedHotel) missingBookings.push('hotel');

        const result = await sendBookingReminder({
          to: member.user.email,
          memberName: member.user.firstName || 'Ami',
          tripName: trip.name,
          destination,
          startDate: trip.finalStartDate,
          endDate: trip.finalEndDate,
          senderName,
          tripUrl,
          missingBookings,
        });

        return {
          memberId: member.id,
          memberName: `${member.user.firstName} ${member.user.lastName}`,
          ...result,
        };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    // Create a system message in the trip chat
    await prisma.tripMessage.create({
      data: {
        tripId: id,
        authorId: user.id,
        content: `📧 ${senderName} a envoyé un rappel de réservation à ${successCount} membre(s)`,
        isSystemMessage: true,
      },
    });

    res.json({
      success: true,
      message: `Reminders sent to ${successCount} member(s)`,
      sentCount: successCount,
      failedCount,
      details: results,
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

export default router;
