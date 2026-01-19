// backend/src/services/socketService.js
// WebSocket service for real-time chat functionality

import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@clerk/clerk-sdk-node';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

// Initialize Anthropic client for AI assistant
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Store connected users: { tripId: { socketId: { userId, user } } }
const tripRooms = new Map();

/**
 * Initialize Socket.io server
 * @param {import('http').Server} httpServer - The HTTP server instance
 * @returns {Server} Socket.io server instance
 */
export function initializeSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://skusku.life',
        'https://www.skusku.life',
        /\.vercel\.app$/,
        /\.skusku\.life$/
      ],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify Clerk token
      const session = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (!session) {
        return next(new Error('Invalid token'));
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { clerkId: session.sub },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          imageUrl: true,
        },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.user.firstName} (${socket.id})`);

    // Join a trip room
    socket.on('join-trip', async (tripId) => {
      try {
        // Verify user has access to this trip
        const membership = await prisma.tripMember.findFirst({
          where: {
            tripId,
            userId: socket.user.id,
          },
        });

        const trip = await prisma.collaborativeTrip.findUnique({
          where: { id: tripId },
        });

        if (!membership && trip?.creatorId !== socket.user.id) {
          socket.emit('error', { message: 'Access denied to this trip' });
          return;
        }

        // Leave previous rooms
        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });

        // Join new room
        socket.join(tripId);

        // Track user in room
        if (!tripRooms.has(tripId)) {
          tripRooms.set(tripId, new Map());
        }
        tripRooms.get(tripId).set(socket.id, {
          userId: socket.user.id,
          user: socket.user,
        });

        // Notify others in the room
        socket.to(tripId).emit('user-joined', {
          user: socket.user,
          activeUsers: getActiveUsers(tripId),
        });

        // Send current active users to the joining user
        socket.emit('joined-trip', {
          tripId,
          activeUsers: getActiveUsers(tripId),
        });

        console.log(`👥 ${socket.user.firstName} joined trip room: ${tripId}`);
      } catch (error) {
        console.error('Error joining trip room:', error);
        socket.emit('error', { message: 'Failed to join trip' });
      }
    });

    // Send a message
    socket.on('send-message', async ({ tripId, content }) => {
      try {
        if (!content || !content.trim()) {
          return socket.emit('error', { message: 'Message cannot be empty' });
        }

        // Save message to database
        const message = await prisma.tripMessage.create({
          data: {
            tripId,
            authorId: socket.user.id,
            content: content.trim(),
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

        // Broadcast to all users in the room (including sender)
        io.to(tripId).emit('new-message', message);

        console.log(`💬 Message in ${tripId}: ${socket.user.firstName}: ${content.substring(0, 50)}...`);

        // Check if message mentions the AI assistant
        if (content.toLowerCase().includes('@assistant')) {
          handleAIAssistant(tripId, content, socket.user, io);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing-start', (tripId) => {
      socket.to(tripId).emit('user-typing', {
        user: socket.user,
        isTyping: true,
      });
    });

    socket.on('typing-stop', (tripId) => {
      socket.to(tripId).emit('user-typing', {
        user: socket.user,
        isTyping: false,
      });
    });

    // Leave trip room
    socket.on('leave-trip', (tripId) => {
      handleLeaveTrip(socket, tripId, io);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.firstName} (${socket.id})`);

      // Remove user from all rooms they were in
      tripRooms.forEach((users, tripId) => {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          io.to(tripId).emit('user-left', {
            user: socket.user,
            activeUsers: getActiveUsers(tripId),
          });

          // Clean up empty rooms
          if (users.size === 0) {
            tripRooms.delete(tripId);
          }
        }
      });
    });
  });

  // Store io instance for use in other services
  global.io = io;

  return io;
}

/**
 * Handle user leaving a trip room
 */
function handleLeaveTrip(socket, tripId, io) {
  socket.leave(tripId);

  const roomUsers = tripRooms.get(tripId);
  if (roomUsers) {
    roomUsers.delete(socket.id);
    io.to(tripId).emit('user-left', {
      user: socket.user,
      activeUsers: getActiveUsers(tripId),
    });

    if (roomUsers.size === 0) {
      tripRooms.delete(tripId);
    }
  }
}

/**
 * Get list of active users in a trip room
 */
function getActiveUsers(tripId) {
  const roomUsers = tripRooms.get(tripId);
  if (!roomUsers) return [];

  const uniqueUsers = new Map();
  roomUsers.forEach((data) => {
    uniqueUsers.set(data.userId, data.user);
  });

  return Array.from(uniqueUsers.values());
}

/**
 * Handle AI assistant requests in chat
 * Detects @assistant mentions and generates helpful responses
 */
async function handleAIAssistant(tripId, userMessage, fromUser, io) {
  try {
    console.log(`🤖 AI Assistant triggered in trip ${tripId}`);

    // Get trip context
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id: tripId },
      include: {
        members: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        proposedTrips: true,
      },
    });

    if (!trip) {
      console.error('Trip not found for AI assistant');
      return;
    }

    // Get recent chat history for context
    const recentMessages = await prisma.tripMessage.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        author: {
          select: { firstName: true },
        },
      },
    });

    // Build context for Claude
    const tripContext = buildTripContext(trip);
    const chatHistory = recentMessages
      .reverse()
      .map(m => `${m.author?.firstName || 'Anonyme'}: ${m.content}`)
      .join('\n');

    // Remove @assistant from the query
    const cleanQuery = userMessage.replace(/@assistant/gi, '').trim();

    // Generate AI response
    const aiResponse = await generateAIResponse(tripContext, chatHistory, cleanQuery, fromUser.firstName);

    // Save AI response as a system message
    const assistantMessage = await prisma.tripMessage.create({
      data: {
        tripId,
        content: aiResponse,
        type: 'system',
        guestName: '🤖 Assistant IA',
      },
    });

    // Broadcast AI response
    io.to(tripId).emit('new-message', {
      ...assistantMessage,
      isSystemMessage: true,
      author: {
        id: 'ai-assistant',
        firstName: '🤖 Assistant',
        lastName: 'IA',
        imageUrl: null,
      },
    });

    console.log(`🤖 AI responded in trip ${tripId}`);
  } catch (error) {
    console.error('AI Assistant error:', error);

    // Send error message
    io.to(tripId).emit('new-message', {
      id: `error-${Date.now()}`,
      content: "Désolé, je n'ai pas pu traiter votre demande. Réessayez dans un instant.",
      isSystemMessage: true,
      createdAt: new Date().toISOString(),
      author: {
        id: 'ai-assistant',
        firstName: '🤖 Assistant',
        lastName: 'IA',
        imageUrl: null,
      },
    });
  }
}

/**
 * Build trip context for AI
 */
function buildTripContext(trip) {
  const members = trip.members.map(m => m.user?.firstName || m.guestName || 'Invité').join(', ');
  const destination = trip.finalDestination
    ? `${trip.finalDestination.city}, ${trip.finalDestination.country}`
    : 'Non définie';
  const dates = trip.finalStartDate && trip.finalEndDate
    ? `Du ${new Date(trip.finalStartDate).toLocaleDateString('fr-FR')} au ${new Date(trip.finalEndDate).toLocaleDateString('fr-FR')}`
    : 'Non définies';
  const status = trip.finalDestination ? 'Confirmé' : (trip.proposedTrips?.length > 0 ? 'En vote' : 'En planification');

  return `
Voyage de groupe: "${trip.name}"
Statut: ${status}
Destination: ${destination}
Dates: ${dates}
Participants: ${members}
Nombre de participants: ${trip.members.length}
`;
}

/**
 * Generate AI response using Claude
 */
async function generateAIResponse(tripContext, chatHistory, userQuery, userName) {
  const systemPrompt = `Tu es un assistant de voyage IA intégré dans le chat d'un groupe de voyageurs. Tu aides à planifier et organiser le voyage.

CONTEXTE DU VOYAGE:
${tripContext}

HISTORIQUE RÉCENT DU CHAT:
${chatHistory}

RÈGLES:
- Réponds en français, de manière concise et amicale
- Utilise des emojis avec modération
- Sois utile et pratique
- Si on te demande de modifier l'itinéraire, suggère des changements mais précise que le créateur du voyage devra les valider
- Tu peux suggérer des activités, restaurants, conseils pratiques
- Reste dans le contexte du voyage planifié
- Limite ta réponse à 200 mots maximum`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${userName} demande: ${userQuery}`,
        },
      ],
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Claude API error:', error);
    return "Désolé, je rencontre des difficultés techniques. Réessayez dans un moment.";
  }
}

/**
 * Broadcast a system message to a trip room
 * Used for notifications like "X joined the trip", "Voting completed", etc.
 */
export function broadcastSystemMessage(tripId, content) {
  if (global.io) {
    global.io.to(tripId).emit('system-message', {
      type: 'system',
      content,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Broadcast trip update to all users in a room
 * Used when trip data changes (votes, bookings, etc.)
 */
export function broadcastTripUpdate(tripId, updateType, data) {
  if (global.io) {
    global.io.to(tripId).emit('trip-update', {
      type: updateType,
      data,
      timestamp: new Date().toISOString(),
    });
  }
}

export default {
  initializeSocketServer,
  broadcastSystemMessage,
  broadcastTripUpdate,
};
