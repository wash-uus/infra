/**
 * useMessaging — React hook for real-time messaging via Socket.io
 * 
 * Handles:
 * - Socket.io connection lifecycle
 * - Message history loading with pagination
 * - Real-time message receiving
 * - Read receipts and unread count tracking
 * - Typing indicators
 * - Error handling and reconnection
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  initMessagingSocket,
  getMessagingSocket,
  closeMessagingSocket,
  reconnectMessagingSocket,
  MessageHistoryItem,
  NewMessagePayload,
  MessageStatusPayload,
  UnreadCountPayload,
  TypingIndicatorPayload,
  MessageErrorPayload,
} from '@/lib/messaging';
import { useAuth } from '@/contexts/AuthContext';

export interface UseMessagingOptions {
  conversationId?: string | null;
}

export interface UseMessagingState {
  // Connection
  connected: boolean;
  loading: boolean;
  error: Error | null;

  // Messages
  messages: MessageHistoryItem[];
  hasMore: boolean;

  // Unread
  unreadCount: number;

  // Typing
  typingUsers: Set<string>;

  // Actions
  joinConversation: (convId: string) => Promise<void>;
  leaveConversation: () => void;
  sendMessage: (text: string) => Promise<string>;
  markMessageRead: (messageId: string) => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  setTyping: (isTyping: boolean) => void;
}

export function useMessaging(options: UseMessagingOptions = {}): UseMessagingState {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<MessageHistoryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentConvIdRef = useRef<string | null>(options.conversationId ?? null);
  const lastTimestampRef = useRef<string | null>(null);

  /**
   * Initialize socket connection
   */
  useEffect(() => {
    if (!user) {
      closeMessagingSocket();
      return;
    }

    const setupSocket = async () => {
      try {
        setLoading(true);
        const socket = await initMessagingSocket();
        socketRef.current = socket;
        setConnected(true);

        // Handle incoming messages
        socket.on('message_history', (payload) => {
          setMessages(payload.messages);
          setHasMore(payload.hasMore);
          if (payload.messages.length > 0) {
            lastTimestampRef.current = payload.messages[0].createdAt;
          }
        });

        socket.on('new_message', (payload: NewMessagePayload) => {
          setMessages((prev) => {
            // Check if message already exists (optimistic update)
            const exists = prev.some((m) => m.id === payload.id);
            if (exists) {
              return prev.map((m) =>
                m.id === payload.id
                  ? {
                      ...m,
                      id: payload.id, // Replace optimistic ID
                      createdAt: payload.createdAt,
                    }
                  : m,
              );
            }
            return [...prev, payload as MessageHistoryItem];
          });
        });

        socket.on('message_status', (payload: MessageStatusPayload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.messageId
                ? { ...m, isRead: payload.isRead, readBy: payload.readBy }
                : m,
            ),
          );
        });

        socket.on('unread_count', (payload: UnreadCountPayload) => {
          setUnreadCount(payload.count);
        });

        socket.on('typing_start', (payload: TypingIndicatorPayload) => {
          setTypingUsers((prev) => new Set(prev).add(payload.userId));
        });

        socket.on('typing_stop', (payload: TypingIndicatorPayload) => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(payload.userId);
            return next;
          });
        });

        socket.on('error', (payload: MessageErrorPayload) => {
          const err = new Error(payload.message);
          setError(err);
          if (process.env.NODE_ENV !== 'production') {
            console.error(`[Messaging Error] ${payload.code}:`, payload.message);
          }
        });

        socket.on('disconnect', () => {
          setConnected(false);
        });

        socket.on('connect', () => {
          setConnected(true);
          // Rejoin conversation if we were in one
          if (currentConvIdRef.current) {
            socket.emit('join_conversation', currentConvIdRef.current);
          }
        });

        setLoading(false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setLoading(false);
      }
    };

    setupSocket();

    // Cleanup on unmount: remove all socket event listeners to prevent duplicate
    // handlers stacking up when the hook remounts (e.g. navigate away and back).
    // The socket itself is a module singleton and must NOT be closed here — that
    // is AuthContext's responsibility (it calls closeMessagingSocket on sign-out).
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      const s = socketRef.current;
      if (s) {
        s.off('message_history');
        s.off('new_message');
        s.off('message_status');
        s.off('unread_count');
        s.off('typing_start');
        s.off('typing_stop');
        s.off('error');
        s.off('disconnect');
        s.off('connect');
      }
    };
  }, [user]);

  /**
   * Join a conversation and load message history
   */
  const joinConversation = useCallback(
    async (convId: string) => {
      if (!socketRef.current?.connected) {
        throw new Error('Socket not connected');
      }

      currentConvIdRef.current = convId;
      lastTimestampRef.current = null;

      return new Promise<void>((resolve, reject) => {
        socketRef.current!.emit('join_conversation', convId, (err: any) => {
          if (err) {
            reject(new Error(err.message ?? 'Failed to join conversation'));
          } else {
            resolve();
          }
        });
      });
    },
    [],
  );

  /**
   * Leave current conversation
   */
  const leaveConversation = useCallback(() => {
    if (socketRef.current?.connected && currentConvIdRef.current) {
      socketRef.current.emit('leave_conversation', currentConvIdRef.current);
    }
    currentConvIdRef.current = null;
    setMessages([]);
    setUnreadCount(0);
    setTypingUsers(new Set());
  }, []);

  /**
   * Send a message to current conversation
   */
  const sendMessage = useCallback(
    (text: string) => {
      return new Promise<string>((resolve, reject) => {
        if (!socketRef.current?.connected) {
          reject(new Error('Socket not connected'));
          return;
        }

        if (!currentConvIdRef.current) {
          reject(new Error('No conversation selected'));
          return;
        }

        if (!text || text.trim().length === 0) {
          reject(new Error('Message cannot be empty'));
          return;
        }

        if (text.length > 5000) {
          reject(new Error('Message too long (max 5000 characters)'));
          return;
        }

        socketRef.current!.emit(
          'send_message',
          {
            conversationId: currentConvIdRef.current,
            text: text.trim(),
          },
          (err: any, messageId?: string) => {
            if (err) {
              reject(new Error(err.message ?? 'Failed to send message'));
            } else {
              resolve(messageId ?? '');
            }
          },
        );
      });
    },
    [],
  );

  /**
   * Mark a message as read
   */
  const markMessageRead = useCallback((messageId: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      if (!currentConvIdRef.current) {
        reject(new Error('No conversation selected'));
        return;
      }

      socketRef.current!.emit(
        'mark_message_read',
        {
          conversationId: currentConvIdRef.current,
          messageId,
        },
        (err: any) => {
          if (err) {
            // Non-critical, don't reject
            if (process.env.NODE_ENV !== 'production') {
              console.warn('Failed to mark message read:', err);
            }
          }
          resolve();
        },
      );
    });
  }, []);

  /**
   * Load more message history (pagination)
   */
  const loadMoreHistory = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      if (!currentConvIdRef.current) {
        reject(new Error('No conversation selected'));
        return;
      }

      if (!lastTimestampRef.current) {
        // No more messages to load
        resolve();
        return;
      }

      socketRef.current!.emit(
        'load_more_history',
        {
          conversationId: currentConvIdRef.current,
          beforeTimestamp: lastTimestampRef.current,
        },
        (err: any) => {
          if (err) {
            reject(new Error(err.message ?? 'Failed to load more messages'));
          } else {
            resolve();
          }
        },
      );
    });
  }, []);

  /**
   * Send typing indicator
   */
  const setTyping = useCallback((isTyping: boolean) => {
    if (!socketRef.current?.connected || !currentConvIdRef.current) {
      return;
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      socketRef.current.emit('typing_start', {
        conversationId: currentConvIdRef.current,
      });

      // Auto-stop typing after inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current!.emit('typing_stop', {
          conversationId: currentConvIdRef.current,
        });
      }, 500);
    } else {
      socketRef.current.emit('typing_stop', {
        conversationId: currentConvIdRef.current,
      });
    }
  }, []);

  return {
    connected,
    loading,
    error,
    messages,
    hasMore,
    unreadCount,
    typingUsers,
    joinConversation,
    leaveConversation,
    sendMessage,
    markMessageRead,
    loadMoreHistory,
    setTyping,
  };
}
