// backend/src/middleware/auth.js
import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../db/prisma.js';

/**
 * Clerk authentication middleware
 * Vérifie le token Bearer et attache l'utilisateur à req.user
 */
export async function authenticateUser(req, res, next) {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Clerk
    const sessionClaims = await clerkClient.verifyToken(token);

    if (!sessionClaims || !sessionClaims.sub) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }

    const clerkId = sessionClaims.sub;

    // Fetch or create user in database
    let user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        preferences: true,
      },
    });

    // If user doesn't exist in our DB, create or update them
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';

      // Check if user exists with same email but different clerkId
      // (happens when switching from Clerk Development to Production)
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUserByEmail) {
        // Update existing user with new clerkId (Dev → Prod migration)
        user = await prisma.user.update({
          where: { email },
          data: {
            clerkId, // Update to new Production clerkId
            firstName: clerkUser.firstName || existingUserByEmail.firstName,
            lastName: clerkUser.lastName || existingUserByEmail.lastName,
            imageUrl: clerkUser.imageUrl || existingUserByEmail.imageUrl,
          },
          include: {
            preferences: true,
          },
        });
        console.log('✅ User migrated to new Clerk ID:', user.email);
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            clerkId,
            email,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            imageUrl: clerkUser.imageUrl,
          },
          include: {
            preferences: true,
          },
        });
        console.log('✅ New user created:', user.email);
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    console.error('Error details:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
      details: error.message
    });
  }
}

/**
 * Optional authentication middleware
 * Attache l'utilisateur s'il est authentifié, sinon continue sans erreur
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const sessionClaims = await clerkClient.verifyToken(token);

    if (sessionClaims && sessionClaims.sub) {
      const user = await prisma.user.findUnique({
        where: { clerkId: sessionClaims.sub },
        include: { preferences: true },
      });

      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    console.error('Optional auth error:', error);
  }

  next();
}
