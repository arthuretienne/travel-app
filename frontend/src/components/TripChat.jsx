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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function TripChat({ tripId, tripName, embedded = false }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [isExpanded, setIsExpanded] = useState(embedded); // Auto-expand if embedded
  const [newMessage, setNewMessage] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Use WebSocket hook
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
  } = useSocket(tripId);

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
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/trips/${tripId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
      <div className="flex flex-col h-full">
        {/* Active Users Bar */}
        {activeUsers.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi size={14} className="text-green-500" />
              ) : (
                <WifiOff size={14} className="text-red-500" />
              )}
              <Users size={14} className="text-gray-400" />
            </div>
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 8).map((u) => (
                <img
                  key={u.id}
                  src={u.imageUrl || `https://ui-avatars.com/api/?name=${u.firstName}`}
                  alt={u.firstName}
                  title={u.firstName}
                  className="w-7 h-7 rounded-full border-2 border-white"
                />
              ))}
              {activeUsers.length > 8 && (
                <span className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                  +{activeUsers.length - 8}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">{activeUsers.length} en ligne</span>
          </div>
        )}

        {/* Messages - Embedded takes full height */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle size={48} className="mb-3" />
              <p className="text-base font-medium">Aucun message</p>
              <p className="text-sm">Commencez la conversation avec votre groupe!</p>
            </div>
          ) : (
            Object.entries(messageGroups).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                <div className="flex items-center justify-center mb-4">
                  <span className="px-4 py-1.5 bg-white rounded-full text-xs font-medium text-gray-500 shadow-sm">
                    {formatDateHeader(msgs[0].createdAt)}
                  </span>
                </div>
                {msgs.map((msg) => {
                  const isOwn = msg.author?.id === user?.id || msg.authorId === user?.id;
                  const isSystem = msg.isSystemMessage;

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
                    >
                      <div className={`flex items-end gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                        {!isOwn && (
                          <img
                            src={msg.author?.imageUrl || `https://ui-avatars.com/api/?name=${msg.author?.firstName}`}
                            alt={msg.author?.firstName}
                            className="w-8 h-8 rounded-full flex-shrink-0"
                          />
                        )}
                        <div>
                          {!isOwn && (
                            <p className="text-xs text-gray-500 mb-1 ml-1 font-medium">
                              {msg.author?.firstName}
                            </p>
                          )}
                          <div
                            className={`px-4 py-2.5 rounded-2xl ${
                              isOwn
                                ? 'bg-primary text-white rounded-br-md'
                                : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
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
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {typingUsers.map((u) => u.firstName).join(', ')} {typingUsers.length === 1 ? 'écrit' : 'écrivent'}...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input - Embedded */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onBlur={stopTyping}
              placeholder={isConnected ? 'Écrivez votre message... (Mentionnez @assistant pour l\'IA)' : 'Connexion en cours...'}
              disabled={!isConnected}
              className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              className="p-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
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
        <div className="mb-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-primary text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle size={20} />
              <div>
                <h3 className="font-semibold text-sm">{tripName || 'Chat du voyage'}</h3>
                <p className="text-xs opacity-80">
                  {activeUsers.length} en ligne
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi size={16} className="text-green-300" />
              ) : (
                <WifiOff size={16} className="text-red-300" />
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Active Users */}
          {activeUsers.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 overflow-x-auto">
              <Users size={14} className="text-gray-400 flex-shrink-0" />
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 5).map((u) => (
                  <img
                    key={u.id}
                    src={u.imageUrl || `https://ui-avatars.com/api/?name=${u.firstName}`}
                    alt={u.firstName}
                    title={u.firstName}
                    className="w-6 h-6 rounded-full border-2 border-white"
                  />
                ))}
                {activeUsers.length > 5 && (
                  <span className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                    +{activeUsers.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="h-72 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageCircle size={32} className="mb-2" />
                <p className="text-sm">Aucun message</p>
                <p className="text-xs">Commencez la conversation!</p>
              </div>
            ) : (
              Object.entries(messageGroups).map(([dateKey, msgs]) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="flex items-center justify-center mb-3">
                    <span className="px-3 py-1 bg-white rounded-full text-xs text-gray-500 shadow-sm">
                      {formatDateHeader(msgs[0].createdAt)}
                    </span>
                  </div>

                  {/* Messages */}
                  {msgs.map((msg) => {
                    const isOwn = msg.author?.id === user?.id || msg.authorId === user?.id;
                    const isSystem = msg.isSystemMessage;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
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
                        <div className={`flex items-end gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {!isOwn && (
                            <img
                              src={msg.author?.imageUrl || `https://ui-avatars.com/api/?name=${msg.author?.firstName}`}
                              alt={msg.author?.firstName}
                              className="w-6 h-6 rounded-full flex-shrink-0"
                            />
                          )}
                          <div>
                            {!isOwn && (
                              <p className="text-xs text-gray-500 mb-1 ml-1">
                                {msg.author?.firstName}
                              </p>
                            )}
                            <div
                              className={`px-3 py-2 rounded-2xl ${
                                isOwn
                                  ? 'bg-primary text-white rounded-br-md'
                                  : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
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
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>
                  {typingUsers.map((u) => u.firstName).join(', ')} {typingUsers.length === 1 ? 'écrit' : 'écrivent'}...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onBlur={stopTyping}
                placeholder={isConnected ? 'Votre message...' : 'Connexion...'}
                disabled={!isConnected}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !isConnected}
                className="p-2 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-500 mt-1 text-center">{error}</p>
            )}
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-4 rounded-full shadow-lg transition-all ${
          isExpanded
            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            : 'bg-primary text-white hover:bg-primary-hover'
        }`}
      >
        {isExpanded ? (
          <ChevronDown size={24} />
        ) : (
          <div className="relative">
            <MessageCircle size={24} />
            {isConnected && activeUsers.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>
        )}
      </button>
    </div>
  );
}
