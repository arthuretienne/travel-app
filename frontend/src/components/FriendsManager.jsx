// frontend/src/components/FriendsManager.jsx
// Component for managing friends list and friend requests

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Users,
  UserPlus,
  Search,
  X,
  Check,
  Clock,
  Loader2,
  Mail,
  UserMinus,
  Send,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function FriendsManager({ isOpen, onClose, onSelectFriend }) {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'add'
  const [friends, setFriends] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [message, setMessage] = useState(null);

  // Load friends data
  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.data.friends);
        setPendingReceived(data.data.pendingReceived);
        setPendingSent(data.data.pendingSent);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search users
  const handleSearch = async () => {
    if (searchQuery.length < 2) return;

    setSearching(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_URL}/api/friends/search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  // Add friend by email
  const handleAddByEmail = async (e) => {
    e.preventDefault();
    if (!addEmail.trim()) return;

    setAddingFriend(true);
    setMessage(null);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: addEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setAddEmail('');
        fetchFriends(); // Refresh list
      } else {
        setMessage({ type: 'error', text: data.error || data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setAddingFriend(false);
    }
  };

  // Accept request
  const handleAccept = async (requestId) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/friends/accept/${requestId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  // Decline request
  const handleDecline = async (requestId) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/friends/decline/${requestId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  // Remove friend
  const handleRemove = async (friendshipId) => {
    if (!confirm('Retirer cet ami ?')) return;

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  // Cancel sent request
  const handleCancel = async (requestId) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/friends/cancel/${requestId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  // Send friend request from search
  const handleSendRequest = async (userId, email) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        // Update search result status
        setSearchResults((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, relationshipStatus: 'request_sent' } : u
          )
        );
        fetchFriends();
      }
    } catch (error) {
      console.error('Error sending request:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sand-100">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Mes amis
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sand-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-sand-100">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'friends'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-main'
            }`}
          >
            Amis ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-main'
            }`}
          >
            Demandes
            {pendingReceived.length > 0 && (
              <span className="absolute top-2 right-1/4 w-5 h-5 bg-clay-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingReceived.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'add'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-main'
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              <UserPlus size={16} />
              Ajouter
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Friends List */}
              {activeTab === 'friends' && (
                <div className="space-y-2">
                  {friends.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary">
                      <Users size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Aucun ami pour le moment</p>
                      <button
                        onClick={() => setActiveTab('add')}
                        className="mt-2 text-primary text-sm hover:underline"
                      >
                        Ajouter des amis
                      </button>
                    </div>
                  ) : (
                    friends.map((friend) => (
                      <div
                        key={friend.friendshipId}
                        className="flex items-center justify-between p-3 bg-sand-50 rounded-xl hover:bg-sand-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={friend.imageUrl || `https://ui-avatars.com/api/?name=${friend.firstName}`}
                            alt={friend.firstName}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="font-medium text-text-main">
                              {friend.firstName} {friend.lastName}
                            </p>
                            <p className="text-xs text-text-secondary">{friend.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {onSelectFriend && (
                            <button
                              onClick={() => {
                                onSelectFriend(friend);
                                onClose();
                              }}
                              className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors"
                            >
                              Inviter
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(friend.friendshipId)}
                            className="p-1.5 text-text-light hover:text-clay-500 hover:bg-clay-100/60 rounded-lg transition-colors"
                            title="Retirer"
                          >
                            <UserMinus size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Requests */}
              {activeTab === 'requests' && (
                <div className="space-y-4">
                  {/* Received */}
                  <div>
                    <h3 className="text-sm font-semibold text-text-secondary mb-2">
                      Demandes reçues ({pendingReceived.length})
                    </h3>
                    {pendingReceived.length === 0 ? (
                      <p className="text-sm text-text-secondary py-2">Aucune demande</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingReceived.map((req) => (
                          <div
                            key={req.requestId}
                            className="flex items-center justify-between p-3 bg-ember-50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={req.from.imageUrl || `https://ui-avatars.com/api/?name=${req.from.firstName}`}
                                alt={req.from.firstName}
                                className="w-10 h-10 rounded-full"
                              />
                              <div>
                                <p className="font-medium text-text-main">
                                  {req.from.firstName} {req.from.lastName}
                                </p>
                                <p className="text-xs text-text-secondary">{req.from.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAccept(req.requestId)}
                                className="p-2 bg-moss-500 text-white rounded-lg hover:bg-moss-500 transition-colors"
                                title="Accepter"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => handleDecline(req.requestId)}
                                className="p-2 bg-sand-200 text-text-secondary rounded-lg hover:bg-sand-300 transition-colors"
                                title="Refuser"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sent */}
                  <div>
                    <h3 className="text-sm font-semibold text-text-secondary mb-2">
                      Demandes envoyées ({pendingSent.length})
                    </h3>
                    {pendingSent.length === 0 ? (
                      <p className="text-sm text-text-secondary py-2">Aucune demande en attente</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingSent.map((req) => (
                          <div
                            key={req.requestId}
                            className="flex items-center justify-between p-3 bg-sand-50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={req.to.imageUrl || `https://ui-avatars.com/api/?name=${req.to.firstName}`}
                                alt={req.to.firstName}
                                className="w-10 h-10 rounded-full"
                              />
                              <div>
                                <p className="font-medium text-text-main">
                                  {req.to.firstName} {req.to.lastName}
                                </p>
                                <p className="text-xs text-text-secondary flex items-center gap-1">
                                  <Clock size={12} /> En attente
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleCancel(req.requestId)}
                              className="px-3 py-1.5 text-text-secondary bg-sand-200 text-sm rounded-lg hover:bg-sand-300 transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add Friend */}
              {activeTab === 'add' && (
                <div className="space-y-4">
                  {/* Add by email */}
                  <form onSubmit={handleAddByEmail} className="space-y-3">
                    <label className="text-sm font-medium text-text-main">
                      Ajouter par email
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                        <input
                          type="email"
                          value={addEmail}
                          onChange={(e) => setAddEmail(e.target.value)}
                          placeholder="ami@email.com"
                          className="w-full pl-10 pr-4 py-2.5 bg-sand-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!addEmail.trim() || addingFriend}
                        className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {addingFriend ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} />
                        )}
                      </button>
                    </div>
                    {message && (
                      <p className={`text-sm ${message.type === 'success' ? 'text-moss-700' : 'text-clay-500'}`}>
                        {message.text}
                      </p>
                    )}
                  </form>

                  {/* Search */}
                  <div className="pt-4 border-t border-sand-100">
                    <label className="text-sm font-medium text-text-main">
                      Rechercher un utilisateur
                    </label>
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          placeholder="Nom ou email..."
                          className="w-full pl-10 pr-4 py-2.5 bg-sand-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <button
                        onClick={handleSearch}
                        disabled={searchQuery.length < 2 || searching}
                        className="px-4 py-2.5 bg-sand-200 text-text-main rounded-xl hover:bg-sand-300 transition-colors disabled:opacity-50"
                      >
                        {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                      </button>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-3 bg-sand-50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={user.imageUrl || `https://ui-avatars.com/api/?name=${user.firstName}`}
                                alt={user.firstName}
                                className="w-10 h-10 rounded-full"
                              />
                              <div>
                                <p className="font-medium text-text-main">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-text-secondary">{user.email}</p>
                              </div>
                            </div>
                            {user.relationshipStatus === 'friends' ? (
                              <span className="px-3 py-1.5 bg-moss-100 text-moss-700 text-xs rounded-lg">
                                Ami
                              </span>
                            ) : user.relationshipStatus === 'request_sent' ? (
                              <span className="px-3 py-1.5 bg-sand-100 text-text-secondary text-xs rounded-lg">
                                Demande envoyée
                              </span>
                            ) : user.relationshipStatus === 'request_received' ? (
                              <button
                                onClick={() => handleAccept(user.friendshipId)}
                                className="px-3 py-1.5 bg-moss-500 text-white text-xs rounded-lg hover:bg-moss-500"
                              >
                                Accepter
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSendRequest(user.id, user.email)}
                                className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary-hover"
                              >
                                Ajouter
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
