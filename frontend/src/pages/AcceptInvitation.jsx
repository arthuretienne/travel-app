// frontend/src/pages/AcceptInvitation.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser, SignedIn, SignedOut } from '@clerk/clerk-react';
import { Loader2, CheckCircle, XCircle, Plane, Users } from 'lucide-react';

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
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!isSignedIn && !guestName.trim()) {
      setError('Please enter your name');
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
      setAccepted(true);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-white to-stone-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-lg text-text-secondary">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-white to-stone-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-main mb-2">Invitation Not Found</h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-white to-stone-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-main mb-2">Welcome Aboard!</h1>
          <p className="text-text-secondary mb-4">
            You've successfully joined <strong>{invitation.trip.name}</strong>
          </p>
          <p className="text-sm text-text-secondary">Redirecting to trip...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-white to-stone-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-teal-600 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plane size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-2">You're Invited!</h1>
          <p className="text-white/80">Join an exciting travel adventure</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-text-main mb-2">
              {invitation.trip.name}
            </h2>
            <p className="text-text-secondary">
              <strong>{invitation.inviter.firstName || invitation.inviter.email}</strong> has invited you to join this collaborative trip
            </p>
          </div>

          {invitation.message && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
              <p className="text-sm text-text-secondary mb-1">Personal message:</p>
              <p className="text-text-main">{invitation.message}</p>
            </div>
          )}

          {/* Features */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0">
                <Users size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-text-main">Collaborate Together</h3>
                <p className="text-sm text-text-secondary">Plan your trip with friends in real-time</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🗳️</span>
              </div>
              <div>
                <h3 className="font-semibold text-text-main">Vote on Destinations</h3>
                <p className="text-sm text-text-secondary">Everyone gets a say in where to go</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-semibold text-text-main">AI-Powered Suggestions</h3>
                <p className="text-sm text-text-secondary">Get personalized recommendations based on group preferences</p>
              </div>
            </div>
          </div>

          {/* Authentication Status */}
          <SignedOut>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800 mb-3">
                <strong>Don't have an account?</strong> No problem! You can join as a guest or sign up for the full experience.
              </p>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </SignedOut>

          <SignedIn>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-800">
                ✅ You're signed in as <strong>{user?.primaryEmailAddress?.emailAddress}</strong>
              </p>
            </div>
          </SignedIn>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 px-6 py-3 border border-gray-300 text-text-secondary font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Joining...
                </>
              ) : (
                'Accept & Join Trip'
              )}
            </button>
          </div>

          <p className="text-center text-xs text-text-secondary mt-4">
            This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
