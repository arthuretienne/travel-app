// frontend/src/lib/guestSession.js
// Session invitée : créée par AcceptInvitation quand quelqu'un rejoint un
// voyage de groupe sans compte. Convention de jeton `guest:<sessionToken>`,
// comprise par le socket (socketService) et le REST (authenticateUserOrGuest).
import { useAuth } from '@clerk/clerk-react';

export function readGuestSession(tripId) {
  try {
    const session = JSON.parse(localStorage.getItem('guestSession') || 'null');
    if (session?.sessionToken && (!tripId || session.tripId === tripId)) return session;
  } catch {
    // session corrompue → ignorée
  }
  return null;
}

/**
 * Jeton d'API pour les écrans d'un voyage de groupe : jeton Clerk si connecté,
 * sinon jeton de session invitée valable pour CE voyage uniquement.
 */
export function useTripAuthToken(tripId) {
  const { getToken, isSignedIn } = useAuth();
  return async () => {
    if (!isSignedIn) {
      const session = readGuestSession(tripId);
      if (session) return `guest:${session.sessionToken}`;
    }
    return getToken();
  };
}
