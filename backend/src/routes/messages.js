// backend/src/routes/messages.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '@clerk/express';

const router = express.Router();
const prisma = new PrismaClient();

// ========================================
// TRIP MESSAGES (CHAT)
// ========================================

/**
 * GET /api/trips/:tripId/messages
 * Get messages for a trip
 */
router.get('/:tripId/messages', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { tripId } = req.params;
    const { limit = 50, before } = req.query;

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find trip and check membership
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if user is a member
    const isMember = trip.members.some((m) => m.userId === user.id);
    const isCreator = trip.creatorId === user.id;

    if (!isMember && !isCreator) {
      return res.status(403).json({ error: 'Only trip members can view messages' });
    }

    // Build query
    const where = {
      tripId,
    };

    if (before) {
      where.createdAt = {
        lt: new Date(before),
      };
    }

    // Get messages
    const messages = await prisma.tripMessage.findMany({
      where,
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
        createdAt: 'desc',
      },
      take: parseInt(limit),
    });

    // Reverse to get chronological order
    messages.reverse();

    res.json({
      success: true,
      data: {
        messages,
        hasMore: messages.length === parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/trips/:tripId/messages
 * Send a message to the trip chat
 */
router.post('/:tripId/messages', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { tripId } = req.params;
    const { content, type = 'message' } = req.body;

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'Message is too long (max 5000 characters)' });
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find trip and check membership
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if user is a member
    const isMember = trip.members.some((m) => m.userId === user.id);
    const isCreator = trip.creatorId === user.id;

    if (!isMember && !isCreator) {
      return res.status(403).json({ error: 'Only trip members can send messages' });
    }

    // Create message
    const message = await prisma.tripMessage.create({
      data: {
        tripId,
        authorId: user.id,
        content: content.trim(),
        type,
      },
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
    });

    // Update member's lastSeenAt
    await prisma.tripMember.updateMany({
      where: {
        tripId,
        userId: user.id,
      },
      data: {
        lastSeenAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * DELETE /api/trips/:tripId/messages/:messageId
 * Delete a message (author or trip creator only)
 */
router.delete('/:tripId/messages/:messageId', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { tripId, messageId } = req.params;

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find message
    const message = await prisma.tripMessage.findUnique({
      where: { id: messageId },
      include: {
        trip: true,
      },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify message belongs to this trip
    if (message.tripId !== tripId) {
      return res.status(400).json({ error: 'Message does not belong to this trip' });
    }

    // Check if user can delete (author or trip creator)
    const isAuthor = message.authorId === user.id;
    const isCreator = message.trip.creatorId === user.id;

    if (!isAuthor && !isCreator) {
      return res.status(403).json({ error: 'Only the message author or trip creator can delete this message' });
    }

    // Cannot delete system messages
    if (message.type === 'system' && !isCreator) {
      return res.status(403).json({ error: 'Cannot delete system messages' });
    }

    // Delete message
    await prisma.tripMessage.delete({
      where: { id: messageId },
    });

    res.json({
      success: true,
      message: 'Message deleted',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

/**
 * PATCH /api/trips/:tripId/messages/:messageId/seen
 * Mark messages as seen (update lastSeenAt for member)
 */
router.patch('/:tripId/messages/seen', requireAuth(), async (req, res) => {
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

    // Update member's lastSeenAt
    await prisma.tripMember.updateMany({
      where: {
        tripId,
        userId: user.id,
      },
      data: {
        lastSeenAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Messages marked as seen',
    });
  } catch (error) {
    console.error('Error marking messages as seen:', error);
    res.status(500).json({ error: 'Failed to mark messages as seen' });
  }
});

export default router;
