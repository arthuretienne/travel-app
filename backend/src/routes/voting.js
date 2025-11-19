// backend/src/routes/voting.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@clerk/express';

const router = express.Router();
const prisma = new PrismaClient();

// ========================================
// PROPOSED DESTINATIONS
// ========================================

/**
 * POST /api/trips/:tripId/destinations
 * Propose a destination for voting
 */
router.post('/:tripId/destinations', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { tripId } = req.params;
    const { savedTripId, city, country, startDate, endDate, estimatedCostPerPerson, tripData } = req.body;

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find trip
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
        proposedTrips: {
          where: {
            proposedBy: user.id,
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if user is a member
    const isMember = trip.members.some((m) => m.userId === user.id);
    const isCreator = trip.creatorId === user.id;

    if (!isMember && !isCreator) {
      return res.status(403).json({ error: 'Only trip members can propose destinations' });
    }

    // Check proposal limits based on member count
    const memberCount = trip.members.length;
    if (memberCount > 5) {
      // Max 1 proposal per person
      if (trip.proposedTrips.length >= 1) {
        return res.status(400).json({
          error: 'You can only propose 1 destination when there are more than 5 members',
        });
      }
    }
    // If <= 5 members, no limit on proposals

    // Validate required fields
    if (!city || !country || !startDate || !endDate || !estimatedCostPerPerson) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (duration <= 0) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Create proposed destination
    const proposedDestination = await prisma.proposedDestination.create({
      data: {
        tripId,
        proposedBy: user.id,
        savedTripId: savedTripId || null,
        city,
        country,
        startDate: start,
        endDate: end,
        duration,
        estimatedCostPerPerson: parseFloat(estimatedCostPerPerson),
        tripData: tripData || {},
      },
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
        votes: true,
      },
    });

    // Create system message
    await prisma.tripMessage.create({
      data: {
        tripId,
        content: `${user.firstName || user.email} proposed ${city}, ${country}`,
        type: 'system',
      },
    });

    res.status(201).json({
      success: true,
      data: proposedDestination,
    });
  } catch (error) {
    console.error('Error proposing destination:', error);
    res.status(500).json({ error: 'Failed to propose destination' });
  }
});

/**
 * DELETE /api/trips/:tripId/destinations/:destinationId
 * Remove a proposed destination (proposer only, before voting starts)
 */
router.delete('/:tripId/destinations/:destinationId', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { tripId, destinationId } = req.params;

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find proposed destination
    const destination = await prisma.proposedDestination.findUnique({
      where: { id: destinationId },
      include: {
        votes: true,
        trip: true,
      },
    });

    if (!destination) {
      return res.status(404).json({ error: 'Destination not found' });
    }

    // Check if user is the proposer or trip creator
    const isProposer = destination.proposedBy === user.id;
    const isCreator = destination.trip.creatorId === user.id;

    if (!isProposer && !isCreator) {
      return res.status(403).json({ error: 'Only the proposer or trip creator can remove this destination' });
    }

    // Check if voting has started
    if (destination.votes.length > 0) {
      return res.status(400).json({ error: 'Cannot remove destination after voting has started' });
    }

    // Delete destination
    await prisma.proposedDestination.delete({
      where: { id: destinationId },
    });

    res.json({
      success: true,
      message: 'Destination removed',
    });
  } catch (error) {
    console.error('Error removing destination:', error);
    res.status(500).json({ error: 'Failed to remove destination' });
  }
});

// ========================================
// VOTING
// ========================================

/**
 * POST /api/trips/:tripId/vote
 * Submit or update votes for destinations
 * Body: { votes: [{ destinationId, rank }] }
 */
router.post('/:tripId/vote', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { tripId } = req.params;
    const { votes, comment } = req.body;

    // Validate votes
    if (!votes || !Array.isArray(votes) || votes.length === 0) {
      return res.status(400).json({ error: 'At least one vote is required' });
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find trip
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
        proposedTrips: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if user is a member
    const isMember = trip.members.some((m) => m.userId === user.id);
    const isCreator = trip.creatorId === user.id;

    if (!isMember && !isCreator) {
      return res.status(403).json({ error: 'Only trip members can vote' });
    }

    // Validate destination IDs
    const destinationIds = votes.map((v) => v.destinationId);
    const validDestinations = trip.proposedTrips.filter((d) =>
      destinationIds.includes(d.id)
    );

    if (validDestinations.length !== destinationIds.length) {
      return res.status(400).json({ error: 'Invalid destination ID(s)' });
    }

    // Validate ranks (must be unique and sequential starting from 1)
    const ranks = votes.map((v) => v.rank);
    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size !== ranks.length) {
      return res.status(400).json({ error: 'Ranks must be unique' });
    }

    // Delete existing votes from this user for this trip
    await prisma.tripVote.deleteMany({
      where: {
        tripId,
        userId: user.id,
      },
    });

    // Create new votes
    const createdVotes = await Promise.all(
      votes.map((vote) =>
        prisma.tripVote.create({
          data: {
            tripId,
            userId: user.id,
            destinationId: vote.destinationId,
            rank: vote.rank,
            comment: vote.comment || comment || null,
          },
          include: {
            destination: true,
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
        })
      )
    );

    // Create system message
    await prisma.tripMessage.create({
      data: {
        tripId,
        content: `${user.firstName || user.email} voted`,
        type: 'vote_update',
      },
    });

    res.status(201).json({
      success: true,
      data: createdVotes,
    });
  } catch (error) {
    console.error('Error submitting votes:', error);
    res.status(500).json({ error: 'Failed to submit votes' });
  }
});

/**
 * GET /api/trips/:tripId/voting-results
 * Calculate voting results using score-based algorithm
 */
router.get('/:tripId/voting-results', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { tripId } = req.params;

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find trip
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
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
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if user has access
    const isMember = trip.members.some((m) => m.userId === user.id);
    const isCreator = trip.creatorId === user.id;

    if (!isMember && !isCreator) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate scores for each destination
    const results = trip.proposedTrips.map((destination) => {
      let totalScore = 0;
      const voteBreakdown = [];

      destination.votes.forEach((vote) => {
        // Score based on rank: 1st place = 5 points, 2nd = 3, 3rd = 1
        let points = 0;
        if (vote.rank === 1) points = 5;
        else if (vote.rank === 2) points = 3;
        else if (vote.rank === 3) points = 1;

        totalScore += points;
        voteBreakdown.push({
          voter: vote.voter,
          rank: vote.rank,
          points,
          comment: vote.comment,
        });
      });

      return {
        destination,
        score: totalScore,
        voteCount: destination.votes.length,
        voteBreakdown,
      };
    });

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Calculate voting progress
    const totalMembers = trip.members.length;
    const votedMembers = new Set(
      trip.proposedTrips.flatMap((d) => d.votes.map((v) => v.userId))
    ).size;
    const votingProgress = totalMembers > 0 ? (votedMembers / totalMembers) * 100 : 0;

    // Check if voting is complete
    const isVotingComplete = trip.requireAllVotes
      ? votedMembers === totalMembers
      : votedMembers >= Math.ceil(totalMembers / 2); // At least 50% voted

    res.json({
      success: true,
      data: {
        results,
        summary: {
          totalDestinations: trip.proposedTrips.length,
          totalMembers,
          votedMembers,
          votingProgress: Math.round(votingProgress),
          isVotingComplete,
          winner: results.length > 0 ? results[0] : null,
        },
      },
    });
  } catch (error) {
    console.error('Error calculating voting results:', error);
    res.status(500).json({ error: 'Failed to calculate voting results' });
  }
});

/**
 * POST /api/trips/:tripId/finalize-vote
 * Finalize voting and select winning destination (creator only)
 */
router.post('/:tripId/finalize-vote', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { tripId } = req.params;
    const { destinationId } = req.body;

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find trip
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id: tripId },
      include: {
        proposedTrips: {
          include: {
            votes: true,
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Only creator can finalize
    if (trip.creatorId !== user.id) {
      return res.status(403).json({ error: 'Only the trip creator can finalize voting' });
    }

    // Find the selected destination
    const selectedDestination = trip.proposedTrips.find((d) => d.id === destinationId);

    if (!selectedDestination) {
      return res.status(404).json({ error: 'Destination not found' });
    }

    // Update trip with final destination
    const updatedTrip = await prisma.collaborativeTrip.update({
      where: { id: tripId },
      data: {
        status: 'destination_selected',
        finalDestination: selectedDestination.tripData,
        finalStartDate: selectedDestination.startDate,
        finalEndDate: selectedDestination.endDate,
        finalDuration: selectedDestination.duration,
        finalBudgetPerPerson: selectedDestination.estimatedCostPerPerson,
      },
      include: {
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

    // Create system message
    await prisma.tripMessage.create({
      data: {
        tripId,
        content: `Voting complete! ${selectedDestination.city}, ${selectedDestination.country} has been selected.`,
        type: 'system',
      },
    });

    // TODO: Send email notifications to all members
    console.log('📧 TODO: Send voting results to all members');

    res.json({
      success: true,
      data: updatedTrip,
    });
  } catch (error) {
    console.error('Error finalizing vote:', error);
    res.status(500).json({ error: 'Failed to finalize vote' });
  }
});

export default router;
