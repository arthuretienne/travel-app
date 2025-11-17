// backend/src/middleware/auth.js
import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../db/prisma.js';

/**
 * Clerk authentication middleware
 * Vérifie le token Bearer et attache l'utilisateur à req.user
 */
export async function authenticateUser(req, res, next) {
  try {
    console.log(`🔐 Auth middleware called for: ${req.method} ${req.path}`);

    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth failed: Missing or invalid authorization header');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔑 Token received, verifying with Clerk...');

    // Verify token with Clerk
    const sessionClaims = await clerkClient.verifyToken(token);
    console.log('✅ Token verified successfully');

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

    // If user doesn't exist in our DB, create them
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkId);

      user = await prisma.user.create({
        data: {
          clerkId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
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

    // Attach user to request
    req.user = user;
    console.log(`✅ Auth successful for user: ${user.email}`);
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
