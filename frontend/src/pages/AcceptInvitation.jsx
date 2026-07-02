// frontend/src/pages/AcceptInvitation.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser, SignedIn, SignedOut } from '@clerk/clerk-react';
import { Loader2, CheckCircle, XCircle, Plane, Users } from 'lucide-react';
import { track } from '../lib/analytics';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/invitations/${token}/details`);

      if (!response.ok) {
        throw new Error('Invitation not found or expired');
      }

      const data = await response.json();
      setInvitation(data.data);
      // La vraie base du taux viral : l'invité qui VOIT la page, qu'il accepte ou non.
      track('invite_landing_viewed', { tripId: data.data?.trip?.id });
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!isSignedIn && !guestName.trim()) {
      setError('Veuillez entrer votre prénom pour continuer');
      return;
    }

    try {
      setAccepting(true);
      setError(null);

      const headers = {
        'Content-Type': 'application/json',
      };

      // Add auth token if signed in
      if (isSignedIn) {
        const authToken = await getToken();
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${API_URL}/api/invitations/${token}/accept`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          guestName: !isSignedIn ? guestName.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept invitation');
      }

      const data = await response.json();

      // Store guest session for chat access (if guest mode)
      if (!isSignedIn && data.data.member.sessionToken) {
        const guestSession = {
          tripId: data.data.trip.id,
          memberId: data.data.member.id,
          sessionToken: data.data.member.sessionToken,
          guestName: guestName.trim(),
        };
        localStorage.setItem('guestSession', JSON.stringify(guestSession));
        console.log('🔐 Guest session stored for chat access');
      }

      setAccepted(true);
      track('invitation_accepted', { tripId: data.data.trip.id, guest: !isSignedIn });

      // Redirect to trip after 2 seconds
      setTimeout(() => {
        navigate(`/trips/${data.data.trip.id}`);
      }, 2000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-subtle">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-lg text-text-secondary">Chargement de l'invitation…</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-subtle p-4">
        <div className="bg-white rounded-[20px] shadow-3 border border-sand-200 max-w-md w-full p-8 text-center">
          <XCircle className="w-16 h-16 text-clay-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-medium text-text-main mb-2">Invitation introuvable</h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-subtle p-4">
        <div className="bg-white rounded-[20px] shadow-3 border border-sand-200 max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-moss-700 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-medium text-text-main mb-2">Bienvenue à bord !</h1>
          <p className="text-text-secondary mb-4">
            Vous avez rejoint <strong>{invitation.trip.name}</strong>
          </p>
          <p className="text-sm text-text-secondary">Redirection vers le voyage…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-subtle p-4">
      <div className="bg-white rounded-[20px] shadow-3 border border-sand-200 max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-sand-900 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plane size={32} />
          </div>
          <h1 className="font-display text-3xl font-medium mb-2">Vous êtes invité !</h1>
          <p className="text-white/80">Rejoignez une aventure de voyage</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl font-medium text-text-main mb-2">
              {invitation.trip.name}
            </h2>
            <p className="text-text-secondary">
              <strong>{invitation.inviter.firstName || invitation.inviter.email}</strong> vous invite à rejoindre ce voyage collaboratif
            </p>
          </div>

          {invitation.message && (
            <div className="bg-gold-100 border-l-4 border-gold-500 p-4 rounded-lg mb-6">
              <p className="text-sm text-text-secondary mb-1">Message personnel :</p>
              <p className="text-text-main">{invitation.message}</p>
            </div>
          )}

          {/* Features */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 p-4 bg-sand-50 rounded-xl">
              <div className="w-10 h-10 bg-ember-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users size={20} className="text-ember-700" />
              </div>
              <div>
                <h3 className="font-semibold text-text-main">Planifier ensemble</h3>
                <p className="text-sm text-text-secondary">Organisez votre voyage avec vos amis en temps réel</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-sand-50 rounded-xl">
              <div className="w-10 h-10 bg-ember-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🗳️</span>
              </div>
              <div>
                <h3 className="font-semibold text-text-main">Voter pour les destinations</h3>
                <p className="text-sm text-text-secondary">Chacun donne son avis sur la destination</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-sand-50 rounded-xl">
              <div className="w-10 h-10 bg-ember-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-semibold text-text-main">Suggestions par IA</h3>
                <p className="text-sm text-text-secondary">Des recommandations personnalisées selon les préférences du groupe</p>
              </div>
            </div>
          </div>

          {/* Authentication Status */}
          <SignedOut>
            <div className="bg-gold-100 border border-gold-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-[#7a5c1a] mb-3">
                <strong>Pas encore de compte ?</strong> Aucun souci — rejoignez en invité ou créez un compte pour l'expérience complète.
              </p>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Entrez votre prénom"
                className="w-full px-4 py-3 border border-sand-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </SignedOut>

          <SignedIn>
            <div className="bg-moss-100 border border-moss-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-[#3d5a24]">
                ✅ Connecté en tant que <strong>{user?.primaryEmailAddress?.emailAddress}</strong>
              </p>
            </div>
          </SignedIn>

          {error && (
            <div className="bg-clay-100 border border-clay-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-clay-500">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 px-6 py-3 border border-sand-200 text-text-secondary font-medium rounded-xl hover:bg-sand-50 transition-colors"
            >
              Refuser
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Connexion…
                </>
              ) : (
                'Accepter et rejoindre'
              )}
            </button>
          </div>

          <p className="text-center text-xs text-text-secondary mt-4">
            Cette invitation expire le {new Date(invitation.expiresAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
}
