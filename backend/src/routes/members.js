// backend/src/routes/members.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// ========================================
// TRIP MEMBERS MANAGEMENT
// ========================================

/**
 * PATCH /api/trips/:tripId/members/:memberId/role
 * Update a member's role (creator only)
 */
router.patch('/:tripId/members/:memberId/role', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { tripId, memberId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['member', 'organizer', 'guest'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Find trip
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Only creator can change roles
    if (trip.creatorId !== user.id) {
      return res.status(403).json({ error: 'Only the trip creator can change member roles' });
    }

    // Update member role
    const updatedMember = await prisma.tripMember.update({
      where: {
        id: memberId,
        tripId, // Ensure member belongs to this trip
      },
      data: {
        role,
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

    res.json({
      success: true,
      data: updatedMember,
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

/**
 * DELETE /api/trips/:tripId/members/:memberId
 * Remove a member from the trip (creator or self)
 */
router.delete('/:tripId/members/:memberId', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { tripId, memberId } = req.params;

    // Find member
    const member = await prisma.tripMember.findUnique({
      where: { id: memberId },
      include: {
        trip: true,
      },
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Verify member belongs to this trip
    if (member.tripId !== tripId) {
      return res.status(400).json({ error: 'Member does not belong to this trip' });
    }

    // Check if user can remove this member
    const isCreator = member.trip.creatorId === user.id;
    const isSelf = member.userId === user.id;

    if (!isCreator && !isSelf) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Cannot remove the creator
    if (member.userId === member.trip.creatorId) {
      return res.status(400).json({ error: 'Cannot remove the trip creator' });
    }

    // Delete member
    await prisma.tripMember.delete({
      where: { id: memberId },
    });

    // Create system message
    const memberName = member.user?.firstName || member.guestName || member.guestEmail;
    await prisma.tripMessage.create({
      data: {
        tripId,
        content: isSelf
          ? `${memberName} left the trip`
          : `${memberName} was removed from the trip`,
        type: 'system',
      },
    });

    res.json({
      success: true,
      message: 'Member removed from trip',
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

/**
 * PATCH /api/trips/:tripId/members/:memberId/booking
 * Update member's booking status
 */
router.patch('/:tripId/members/:memberId/booking', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { tripId, memberId } = req.params;
    const { hasBookedFlight, hasBookedHotel, bookingConfirmed } = req.body;

    // Find member
    const member = await prisma.tripMember.findUnique({
      where: { id: memberId },
      include: {
        trip: true,
      },
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Verify member belongs to this trip
    if (member.tripId !== tripId) {
      return res.status(400).json({ error: 'Member does not belong to this trip' });
    }

    // Check if user can update this member's booking
    const isCreator = member.trip.creatorId === user.id;
    const isSelf = member.userId === user.id;

    if (!isCreator && !isSelf) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prepare update data
    const updateData = {};
    if (hasBookedFlight !== undefined) updateData.hasBookedFlight = hasBookedFlight;
    if (hasBookedHotel !== undefined) updateData.hasBookedHotel = hasBookedHotel;
    if (bookingConfirmed !== undefined) updateData.bookingConfirmed = bookingConfirmed;

    // Update member booking status
    const updatedMember = await prisma.tripMember.update({
      where: { id: memberId },
      data: updateData,
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

    // Create system message if booking is confirmed
    if (bookingConfirmed && !member.bookingConfirmed) {
      const memberName = updatedMember.user?.firstName || updatedMember.guestName || updatedMember.guestEmail;
      await prisma.tripMessage.create({
        data: {
          tripId,
          content: `${memberName} confirmed their booking!`,
          type: 'system',
        },
      });
    }

    res.json({
      success: true,
      data: updatedMember,
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

/**
 * PATCH /api/trips/:tripId/members/:memberId/preferences
 * Update member's trip preferences (dates, budget, activities)
 */
router.patch('/:tripId/members/:memberId/preferences', authenticateUser, async (req, res) => {
  try {
    const user = req.user; // Already authenticated by middleware
    const { tripId, memberId } = req.params;
    const { availableDates, budgetRange, preferredActivities } = req.body;

    // Find member
    const member = await prisma.tripMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Verify member belongs to this trip
    if (member.tripId !== tripId) {
      return res.status(400).json({ error: 'Member does not belong to this trip' });
    }

    // Only member can update their own preferences
    if (member.userId !== user.id) {
      return res.status(403).json({ error: 'Can only update your own preferences' });
    }

    // Prepare update data
    const updateData = {};
    if (availableDates !== undefined) updateData.availableDates = availableDates;
    if (budgetRange !== undefined) updateData.budgetRange = budgetRange;
    if (preferredActivities !== undefined) updateData.preferredActivities = preferredActivities;

    // Update member preferences
    const updatedMember = await prisma.tripMember.update({
      where: { id: memberId },
      data: updateData,
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

    res.json({
      success: true,
      data: updatedMember,
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
