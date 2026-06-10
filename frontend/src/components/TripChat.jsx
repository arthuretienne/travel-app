// frontend/src/components/TripChat.jsx
// Real-time chat component for collaborative trips

import { useState, useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  MessageCircle,
  Send,
  Users,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import useSocket from '../hooks/useSocket';
import useGuestSocket from '../hooks/useGuestSocket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function TripChat({ tripId, tripName, embedded = false, guestSession = null }) {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [isExpanded, setIsExpanded] = useState(embedded); // Auto-expand if embedded
  const [newMessage, setNewMessage] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Determine if we're in guest mode
  const isGuestMode = !isSignedIn && guestSession?.sessionToken;

  // Use appropriate WebSocket hook
  const regularSocket = useSocket(isGuestMode ? null : tripId);
  const guestSocket = useGuestSocket(isGuestMode ? tripId : null, guestSession);

  // Select active socket based on mode
  const {
    isConnected,
    messages,
    activeUsers,
    typingUsers,
    error,
    sendMessage,
    startTyping,
    stopTyping,
    loadInitialMessages,
  } = isGuestMode ? guestSocket : regularSocket;

  // Get current user info for message display
  const currentUserId = isGuestMode
    ? `guest_${guestSession?.memberId}`
    : user?.id;
  const currentUserName = isGuestMode
    ? guestSession?.guestName
    : user?.firstName;

  // Load message history when chat is opened or mounted (for embedded)
  useEffect(() => {
    if ((isExpanded || embedded) && tripId && messages.length === 0) {
      loadMessageHistory();
    }
  }, [isExpanded, tripId, embedded]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isExpanded) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  // Load message history from REST API
  const loadMessageHistory = async () => {
    setLoadingHistory(true);
    try {
      // For guests, we can load history without auth (public trip access)
      // For authenticated users, we use their token
      const headers = {};
      if (!isGuestMode) {
        const token = await getToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/trips/${tripId}/messages`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        // API returns { data: { messages: [...], hasMore: bool } }
        if (data.success && data.data?.messages) {
          loadInitialMessages(data.data.messages);
        }
      }
    } catch (err) {
      console.error('Failed to load message history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle send message
  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim() && isConnected) {
      sendMessage(newMessage);
      setNewMessage('');
      stopTyping();
    }
  };

  // Handle typing
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    startTyping();
  };

  // Format timestamp
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Highlight @assistant mentions in the signature ember tone
  const renderMentions = (text) =>
    String(text).split(/(@assistant)/g).map((part, i) =>
      part === '@assistant'
        ? <span key={i} className="font-semibold text-ember-600">{part}</span>
        : <span key={i}>{part}</span>
    );

  // Format date header
  const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    }
  };

  // Group messages by date
  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach((msg) => {
      const dateKey = new Date(msg.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);


  // Embedded mode - render inline without floating container
  if (embedded) {
    return (
      <div className="flex h-full flex-col bg-white">
        {/* Active Users Bar */}
        {activeUsers.length > 0 && (
          <div className="flex items-center gap-3 border-b border-sand-200 bg-sand-50 px-4 py-2">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi size={14} className="text-moss-500" />
              ) : (
                <WifiOff size={14} className="text-text-light" />
              )}
              <Users size={14} className="text-text-light" />
            </div>
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 8).map((u) => (
                <img
                  key={u.id}
                  src={u.imageUrl || `https://ui-avatars.com/api/?name=${u.firstName}`}
                  alt={u.firstName}
                  title={u.firstName}
                  className="h-7 w-7 rounded-full border-2 border-white"
                />
              ))}
              {activeUsers.length > 8 && (
                <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-sand-200 text-xs font-medium text-text-secondary">
                  +{activeUsers.length - 8}
                </span>
              )}
            </div>
            <span className="text-xs text-text-muted">{activeUsers.length} en ligne</span>
          </div>
        )}

        {/* Messages - Embedded takes full height */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-sand-50 p-4">
          {loadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-ember-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-text-light">
              <MessageCircle size={48} className="mb-3" />
              <p className="text-base font-medium text-text-secondary">Aucun message</p>
              <p className="text-sm">Commencez la conversation avec votre groupe !</p>
            </div>
          ) : (
            Object.entries(messageGroups).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                <div className="mb-4 flex items-center justify-center">
                  <span className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-text-muted shadow-1">
                    {formatDateHeader(msgs[0].createdAt)}
                  </span>
                </div>
                {msgs.map((msg) => {
                  const isOwn = msg.author?.id === currentUserId || msg.authorId === currentUserId || (msg.isGuest && msg.author?.firstName === currentUserName);
                  const isSystem = msg.isSystemMessage;

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="my-3 flex justify-center">
                        <span className="rounded-full bg-sand-100 px-4 py-1.5 text-sm text-text-secondary">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`mb-3 flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-[70%] items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        {!isOwn && (
                          <img
                            src={msg.author?.imageUrl || `https://ui-avatars.com/api/?name=${msg.author?.firstName}`}
                            alt={msg.author?.firstName}
                            className="h-8 w-8 flex-shrink-0 rounded-full"
                          />
                        )}
                        <div>
                          {!isOwn && (
                            <p className="mb-1 ml-1 text-xs font-medium text-text-muted">
                              {msg.author?.firstName}
                            </p>
                          )}
                          <div
                            className={`px-4 py-2.5 text-sm ${isOwn
                              ? 'rounded-[14px_4px_14px_14px] bg-sand-900 text-white'
                              : 'rounded-[4px_14px_14px_14px] border border-sand-200 bg-white text-text-main'
                              }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{renderMentions(msg.content)}</p>
                          </div>
                          <p className={`mt-1 font-mono text-[11px] text-text-light ${isOwn ? 'mr-1 text-right' : 'ml-1'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-sand-400" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-sand-400" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-sand-400" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {typingUsers.map((u) => u.firstName).join(', ')} {typingUsers.length === 1 ? 'écrit' : 'écrivent'}…
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input - Embedded */}
        <form onSubmit={handleSend} className="border-t border-sand-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onBlur={stopTyping}
              placeholder={isConnected ? 'Écrire au groupe… @assistant pour l\'IA' : 'Connexion en cours…'}
              disabled={!isConnected}
              className="h-11 flex-1 rounded-xl border border-sand-200 bg-sand-50 px-4 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
          {error && (
            <p className="mt-2 text-center text-xs text-clay-500">{error}</p>
          )}
        </form>
      </div>
    );
  }

  // Floating mode (original behavior)
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      {/* Chat Window */}
      {isExpanded && (
        <div className="sk-pop mb-2 w-80 overflow-hidden rounded-[18px] border border-sand-200 bg-white shadow-3 sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary p-4 text-white">
            <div className="flex items-center gap-3">
              <MessageCircle size={20} />
              <div>
                <h3 className="text-sm font-semibold">{tripName || 'Chat du voyage'}</h3>
                <p className="font-mono text-[11px] text-white/80">
                  {activeUsers.length} en ligne
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi size={16} className="text-white" />
              ) : (
                <WifiOff size={16} className="text-white/50" />
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="rounded-lg p-1 transition-colors hover:bg-white/20"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Active Users */}
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto border-b border-sand-200 bg-sand-50 px-4 py-2">
              <Users size={14} className="flex-shrink-0 text-text-light" />
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 5).map((u) => (
                  <img
                    key={u.id}
                    src={u.imageUrl || `https://ui-avatars.com/api/?name=${u.firstName}`}
                    alt={u.firstName}
                    title={u.firstName}
                    className="h-6 w-6 rounded-full border-2 border-white"
                  />
                ))}
                {activeUsers.length > 5 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-sand-200 text-[11px] font-medium text-text-secondary">
                    +{activeUsers.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="h-72 space-y-4 overflow-y-auto bg-sand-50 p-4">
            {loadingHistory ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-text-light">
                <MessageCircle size={32} className="mb-2" />
                <p className="text-sm">Aucun message</p>
                <p className="text-xs">Commencez la conversation !</p>
              </div>
            ) : (
              Object.entries(messageGroups).map(([dateKey, msgs]) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="mb-3 flex items-center justify-center">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-text-muted shadow-1">
                      {formatDateHeader(msgs[0].createdAt)}
                    </span>
                  </div>

                  {/* Messages */}
                  {msgs.map((msg) => {
                    const isOwn = msg.author?.id === currentUserId || msg.authorId === currentUserId || (msg.isGuest && msg.author?.firstName === currentUserName);
                    const isSystem = msg.isSystemMessage;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="my-2 flex justify-center">
                          <span className="rounded-full bg-sand-100 px-3 py-1 text-[11px] text-text-secondary">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
                      >
                        <div className={`flex max-w-[80%] items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {!isOwn && (
                            <img
                              src={msg.author?.imageUrl || `https://ui-avatars.com/api/?name=${msg.author?.firstName}`}
                              alt={msg.author?.firstName}
                              className="h-6 w-6 flex-shrink-0 rounded-full"
                            />
                          )}
                          <div>
                            {!isOwn && (
                              <p className="mb-1 ml-1 text-[11px] text-text-muted">
                                {msg.author?.firstName}
                              </p>
                            )}
                            <div
                              className={`px-3 py-2 ${isOwn
                                ? 'rounded-[14px_4px_14px_14px] bg-sand-900 text-white'
                                : 'rounded-[4px_14px_14px_14px] border border-sand-200 bg-white text-text-main'
                                }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm">{renderMentions(msg.content)}</p>
                            </div>
                            <p className={`mt-1 font-mono text-[11px] text-text-light ${isOwn ? 'mr-1 text-right' : 'ml-1'}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-sand-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-sand-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-sand-400" style={{ animationDelay: '300ms' }} />
                </div>
                <span>
                  {typingUsers.map((u) => u.firstName).join(', ')} {typingUsers.length === 1 ? 'écrit' : 'écrivent'}...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-sand-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onBlur={stopTyping}
                placeholder={isConnected ? 'Écrire au groupe… @assistant pour l’IA' : 'Connexion…'}
                disabled={!isConnected}
                className="flex-1 rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-sm text-text-main placeholder:text-text-light focus:border-ember-400 focus:outline-none focus:ring-2 focus:ring-ember-100 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !isConnected}
                className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
            {error && (
              <p className="mt-1 text-center text-xs text-clay-500">{error}</p>
            )}
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`rounded-full p-4 shadow-2 transition-all ${isExpanded
          ? 'bg-sand-100 text-text-secondary hover:bg-sand-200'
          : 'bg-primary text-white hover:bg-primary-hover'
          }`}
      >
        {isExpanded ? (
          <ChevronDown size={24} />
        ) : (
          <div className="relative">
            <MessageCircle size={24} />
            {isConnected && activeUsers.length > 0 && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-moss-500" />
            )}
          </div>
        )}
      </button>
    </div>
  );
}
