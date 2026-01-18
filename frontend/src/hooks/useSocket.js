// frontend/src/hooks/useSocket.js
// Custom hook for WebSocket connection to trip chat

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Custom hook for real-time trip chat using WebSocket
 * @param {string} tripId - The ID of the trip to join
 * @returns {Object} Socket state and methods
 */
export function useSocket(tripId) {
  const { getToken } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    let mounted = true;

    const connectSocket = async () => {
      try {
        const token = await getToken();
        if (!token || !tripId) return;

        // Create socket connection
        const newSocket = io(API_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketRef.current = newSocket;

        // Connection events
        newSocket.on('connect', () => {
          if (mounted) {
            console.log('🔌 Socket connected');
            setIsConnected(true);
            setError(null);
            // Join the trip room
            newSocket.emit('join-trip', tripId);
          }
        });

        newSocket.on('disconnect', (reason) => {
          if (mounted) {
            console.log('🔌 Socket disconnected:', reason);
            setIsConnected(false);
          }
        });

        newSocket.on('connect_error', (err) => {
          if (mounted) {
            console.error('🔌 Socket connection error:', err.message);
            setError(err.message);
            setIsConnected(false);
          }
        });

        // Trip room events
        newSocket.on('joined-trip', ({ tripId: joinedTripId, activeUsers: users }) => {
          if (mounted) {
            console.log(`👥 Joined trip ${joinedTripId}, active users:`, users.length);
            setActiveUsers(users);
          }
        });

        newSocket.on('user-joined', ({ user, activeUsers: users }) => {
          if (mounted) {
            console.log(`👤 ${user.firstName} joined`);
            setActiveUsers(users);
          }
        });

        newSocket.on('user-left', ({ user, activeUsers: users }) => {
          if (mounted) {
            console.log(`👤 ${user.firstName} left`);
            setActiveUsers(users);
          }
        });

        // Message events
        newSocket.on('new-message', (message) => {
          if (mounted) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === message.id)) return prev;
              return [...prev, message];
            });
          }
        });

        newSocket.on('system-message', (message) => {
          if (mounted) {
            setMessages((prev) => [
              ...prev,
              {
                id: `system-${Date.now()}`,
                type: 'system',
                content: message.content,
                createdAt: message.timestamp,
                isSystemMessage: true,
              },
            ]);
          }
        });

        // Typing events
        newSocket.on('user-typing', ({ user, isTyping }) => {
          if (mounted) {
            setTypingUsers((prev) => {
              if (isTyping) {
                if (prev.some((u) => u.id === user.id)) return prev;
                return [...prev, user];
              } else {
                return prev.filter((u) => u.id !== user.id);
              }
            });
          }
        });

        // Trip update events (for voting, booking status, etc.)
        newSocket.on('trip-update', ({ type, data }) => {
          if (mounted) {
            console.log(`📢 Trip update: ${type}`, data);
            // Emit custom event for components to handle
            window.dispatchEvent(
              new CustomEvent('trip-update', { detail: { type, data } })
            );
          }
        });

        // Error handling
        newSocket.on('error', ({ message }) => {
          if (mounted) {
            console.error('🔌 Socket error:', message);
            setError(message);
          }
        });

        if (mounted) {
          setSocket(newSocket);
        }
      } catch (err) {
        console.error('Failed to connect socket:', err);
        if (mounted) {
          setError(err.message);
        }
      }
    };

    connectSocket();

    // Cleanup
    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.emit('leave-trip', tripId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [tripId, getToken]);

  // Send a message
  const sendMessage = useCallback(
    (content) => {
      if (socketRef.current && isConnected && content.trim()) {
        socketRef.current.emit('send-message', { tripId, content });
      }
    },
    [tripId, isConnected]
  );

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing-start', tripId);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('typing-stop', tripId);
        }
      }, 3000);
    }
  }, [tripId, isConnected]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing-stop', tripId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [tripId, isConnected]);

  // Load initial messages (from REST API)
  const loadInitialMessages = useCallback((initialMessages) => {
    setMessages(initialMessages);
  }, []);

  return {
    isConnected,
    messages,
    activeUsers,
    typingUsers,
    error,
    sendMessage,
    startTyping,
    stopTyping,
    loadInitialMessages,
  };
}

export default useSocket;
