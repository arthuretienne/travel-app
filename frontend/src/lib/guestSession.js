// frontend/src/lib/guestSession.js
// Session invitée : créée par AcceptInvitation quand quelqu'un rejoint un
// voyage de groupe sans compte. Convention de jeton `guest:<sessionToken>`,
// comprise par le socket (socketService) et le REST (authenticateUserOrGuest).
import { useCallback } from 'react';
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
  // useCallback est indispensable : ce jeton sert de dépendance d'effects
  // (stream SSE d'itinéraire). Une identité neuve à chaque render relançait
  // le stream en continu — 463 requêtes mesurées sur une seule page ouverte
  // (audit V4, P0 #1).
  return useCallback(async () => {
    if (!isSignedIn) {
      const session = readGuestSession(tripId);
      if (session) return `guest:${session.sessionToken}`;
    }
    return getToken();
  }, [tripId, isSignedIn, getToken]);
}
