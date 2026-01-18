// backend/src/routes/friends.js
// Routes for friend management system

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/friends
 * Get all friends and pending requests for the authenticated user
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const user = req.user;

    // Get accepted friendships (both directions)
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: user.id, status: 'accepted' },
          { friendId: user.id, status: 'accepted' },
        ],
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
        friend: {
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

    // Get pending requests received
    const pendingReceived = await prisma.friendship.findMany({
      where: {
        friendId: user.id,
        status: 'pending',
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

    // Get pending requests sent
    const pendingSent = await prisma.friendship.findMany({
      where: {
        userId: user.id,
        status: 'pending',
      },
      include: {
        friend: {
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

    // Format friends list (extract the "other" person from each friendship)
    const friends = friendships.map((f) => {
      const friend = f.userId === user.id ? f.friend : f.user;
      return {
        friendshipId: f.id,
        ...friend,
        since: f.acceptedAt || f.createdAt,
      };
    });

    res.json({
      success: true,
      data: {
        friends,
        pendingReceived: pendingReceived.map((p) => ({
          requestId: p.id,
          from: p.user,
          createdAt: p.createdAt,
        })),
        pendingSent: pendingSent.map((p) => ({
          requestId: p.id,
          to: p.friend,
          createdAt: p.createdAt,
        })),
        summary: {
          totalFriends: friends.length,
          pendingReceived: pendingReceived.length,
          pendingSent: pendingSent.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

/**
 * POST /api/friends/request
 * Send a friend request by email
 */
router.post('/request', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Can't friend yourself
    if (email.toLowerCase() === user.email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot add yourself as a friend' });
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        imageUrl: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with this email address',
      });
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: user.id, friendId: targetUser.id },
          { userId: targetUser.id, friendId: user.id },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({ error: 'You are already friends with this user' });
      }
      if (existingFriendship.status === 'pending') {
        // If the other person sent a request, auto-accept
        if (existingFriendship.userId === targetUser.id) {
          const updated = await prisma.friendship.update({
            where: { id: existingFriendship.id },
            data: { status: 'accepted', acceptedAt: new Date() },
          });
          return res.json({
            success: true,
            message: 'Friend request accepted! You were both trying to add each other.',
            data: { friendship: updated, friend: targetUser },
          });
        }
        return res.status(400).json({ error: 'Friend request already pending' });
      }
      if (existingFriendship.status === 'blocked') {
        return res.status(400).json({ error: 'Unable to send friend request' });
      }
    }

    // Create friend request
    const friendship = await prisma.friendship.create({
      data: {
        userId: user.id,
        friendId: targetUser.id,
        status: 'pending',
        requestedBy: user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Friend request sent',
      data: {
        requestId: friendship.id,
        to: targetUser,
      },
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * POST /api/friends/accept/:requestId
 * Accept a friend request
 */
router.post('/accept/:requestId', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.params;

    // Find the pending request
    const request = await prisma.friendship.findUnique({
      where: { id: requestId },
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

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Verify the current user is the recipient
    if (request.friendId !== user.id) {
      return res.status(403).json({ error: 'You cannot accept this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'This request is no longer pending' });
    }

    // Accept the request
    const updated = await prisma.friendship.update({
      where: { id: requestId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Friend request accepted',
      data: {
        friendshipId: updated.id,
        friend: request.user,
      },
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

/**
 * POST /api/friends/decline/:requestId
 * Decline a friend request
 */
router.post('/decline/:requestId', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.params;

    const request = await prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Verify the current user is the recipient
    if (request.friendId !== user.id) {
      return res.status(403).json({ error: 'You cannot decline this request' });
    }

    // Delete the request
    await prisma.friendship.delete({
      where: { id: requestId },
    });

    res.json({
      success: true,
      message: 'Friend request declined',
    });
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

/**
 * DELETE /api/friends/:friendshipId
 * Remove a friend
 */
router.delete('/:friendshipId', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const { friendshipId } = req.params;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    // Verify the current user is part of this friendship
    if (friendship.userId !== user.id && friendship.friendId !== user.id) {
      return res.status(403).json({ error: 'You cannot remove this friend' });
    }

    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    res.json({
      success: true,
      message: 'Friend removed',
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

/**
 * POST /api/friends/cancel/:requestId
 * Cancel a sent friend request
 */
router.post('/cancel/:requestId', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.params;

    const request = await prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Verify the current user sent this request
    if (request.userId !== user.id) {
      return res.status(403).json({ error: 'You cannot cancel this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'This request is no longer pending' });
    }

    await prisma.friendship.delete({
      where: { id: requestId },
    });

    res.json({
      success: true,
      message: 'Friend request cancelled',
    });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({ error: 'Failed to cancel friend request' });
  }
});

/**
 * GET /api/friends/search
 * Search for users to add as friends
 */
router.get('/search', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Search by email or name
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: user.id } }, // Exclude self
          {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        imageUrl: true,
      },
      take: 10,
    });

    // Get existing friendships to mark status
    const existingFriendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: user.id, friendId: { in: users.map((u) => u.id) } },
          { friendId: user.id, userId: { in: users.map((u) => u.id) } },
        ],
      },
    });

    // Mark each user with their relationship status
    const usersWithStatus = users.map((u) => {
      const friendship = existingFriendships.find(
        (f) =>
          (f.userId === user.id && f.friendId === u.id) ||
          (f.friendId === user.id && f.userId === u.id)
      );

      let relationshipStatus = 'none';
      if (friendship) {
        if (friendship.status === 'accepted') {
          relationshipStatus = 'friends';
        } else if (friendship.status === 'pending') {
          relationshipStatus = friendship.userId === user.id ? 'request_sent' : 'request_received';
        }
      }

      return {
        ...u,
        relationshipStatus,
        friendshipId: friendship?.id,
      };
    });

    res.json({
      success: true,
      data: usersWithStatus,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router;
