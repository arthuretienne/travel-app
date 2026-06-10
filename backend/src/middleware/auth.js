// backend/src/middleware/auth.js
import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../db/prisma.js';

/**
 * Clerk authentication middleware
 * Vérifie le token Bearer et attache l'utilisateur à req.user
 */
// DEV-ONLY impersonation bypass.
// When running locally (NODE_ENV=development or DEV_MODE=true), a request may
// authenticate as a seeded user by sending `Authorization: Bearer dev:<userId>`.
// This NEVER activates in production (NODE_ENV=production + DEV_MODE unset).
// Belt-and-suspenders: NEVER enable the impersonation bypass in production,
// even if DEV_MODE is somehow set there. A stray DEV_MODE=true on Render would
// otherwise turn `Bearer dev:<userId>` into a full account-takeover primitive.
const DEV_AUTH_ENABLED =
  process.env.NODE_ENV !== 'production' &&
  (process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true');

async function tryDevImpersonation(authHeader) {
  if (!DEV_AUTH_ENABLED) return null;
  if (!authHeader || !authHeader.startsWith('Bearer dev:')) return null;
  const userId = authHeader.slice('Bearer dev:'.length).trim();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });
  if (user) {
    console.log(`🧪 DEV impersonation as ${user.firstName || user.email} (${user.id})`);
  }
  return user; // null if not found → caller falls through to normal error
}

export async function authenticateUser(req, res, next) {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;

    // DEV-only: impersonate a seeded user via `Bearer dev:<userId>`
    const devUser = await tryDevImpersonation(authHeader);
    if (devUser) {
      req.user = devUser;
      return next();
    }

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
        console.log('✅ User migrated to new Clerk ID:', user.id);
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
        console.log('✅ New user created:', user.id);
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    // Log full detail server-side; never leak internals to the client.
    console.error('❌ Authentication error:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
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

    // DEV-only impersonation (see tryDevImpersonation above)
    const devUser = await tryDevImpersonation(authHeader);
    if (devUser) {
      req.user = devUser;
      return next();
    }

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
