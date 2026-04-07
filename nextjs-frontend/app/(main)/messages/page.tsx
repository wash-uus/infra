'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, MessageSquare, AlertCircle, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Conversation, Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/hooks/useMessaging';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConversionNudge from '@/components/ui/ConversionNudge';
import { useConversionNudge } from '@/hooks/useConversionNudge';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function MessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const withUserId = searchParams.get('with');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const prevMsgCountRef = useRef(0);

  // Load conversations list
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get('/messaging/conversations');
      return res.data.data;
    },
    enabled: !!user,
  });

  // Initialize Socket.io messaging
  const {
    connected,
    loading: socketLoading,
    error: socketError,
    messages,
    joinConversation,
    leaveConversation,
    sendMessage,
    markMessageRead,
    setTyping,
    typingUsers,
  } = useMessaging({ conversationId: selectedConvId });

  // Start or find conversation with a user (from ?with= param)
  const startConvMutation = useMutation({
    mutationFn: (targetId: string) => api.post('/messaging/conversations', { participantId: targetId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConvId(res.data.data.id);
      router.replace('/messages');
    },
    onError: () => toast.error('Could not start conversation. Please try again.'),
  });

  // Auto-start conversation if ?with= param is present
  useEffect(() => {
    if (withUserId && user) {
      startConvMutation.mutate(withUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withUserId, user]);

  // Join conversation when selected
  useEffect(() => {
    if (!selectedConvId || !connected) return;

    const join = async () => {
      try {
        await joinConversation(selectedConvId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setSendError(error.message);
      }
    };

    join();
  }, [selectedConvId, connected, joinConversation]);

  // Mark conversation as read when we view messages
  useEffect(() => {
    if (!selectedConvId || messages.length === 0) return;

    // Mark the last message as read
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.isRead === false) {
      markMessageRead(lastMsg.id).catch(() => {
        // Non-critical, don't show error
      });
    }
  }, [selectedConvId, messages, markMessageRead]);

  // Scroll to bottom when messages change.
  // Use instant scroll for history loads (prevCount === 0 or bulk load) so the
  // view lands at the bottom without animating through hundreds of messages.
  // Use smooth only when a single new message arrives.
  useEffect(() => {
    const prevCount = prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;
    if (!messages.length) return;
    const behavior = prevCount === 0 || messages.length - prevCount > 1 ? 'auto' : 'smooth';
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, [messages]);

  // Convert Socket.io messages to Message type for rendering
  const displayMessages = useMemo<Message[]>(() => {
    return messages.map((msg) => ({
      id: msg.id,
      conversationId: selectedConvId ?? '',
      senderId: msg.senderId,
      senderName: msg.senderName,
      content: msg.text,
      isRead: msg.isRead ?? false,
      readBy: msg.readBy ?? [],
      createdAt: msg.createdAt,
    }));
  }, [messages, selectedConvId]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !connected) return;

    setSendError(null);
    setNewMessage('');

    try {
      await sendMessage(trimmed);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const msg = error.message.toLowerCase();
      if (msg.includes('gate') || msg.includes('limit') || msg.includes('upgrade') || msg.includes('blocked')) {
        triggerNudge('BLOCKED_REPLY');
      } else {
        setSendError(error.message);
      }
      setNewMessage(trimmed);
    }
  }, [newMessage, connected, sendMessage]);

  // Cleanup typing debounce and leave conversation room on unmount
  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      leaveConversation();
    };
  // leaveConversation is stable (useCallback with [] deps in useMessaging)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle typing indicators
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value);
      setIsTyping(true);

      // Forward typing state to socket — clears previous debounce timer
      setTyping(true);

      // Clear previous timeout
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }

      // Auto-stop typing after inactivity
      typingDebounceRef.current = setTimeout(() => {
        setIsTyping(false);
        setTyping(false);
      }, 500);
    },
    [setTyping],
  );

  const selectedConv = conversations?.find((c) => c.id === selectedConvId);
  const { nudge, triggerNudge, clearNudge } = useConversionNudge();

  const getOtherParticipant = (conv: Conversation) => {
    if (!user) return null;
    return conv.participantNames?.[conv.participants.find((p) => p !== user.uid) ?? ''] ?? 'Unknown';
  };

  const otherUserTyping = Array.from(typingUsers).filter((uid) => uid !== user?.uid);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 h-[calc(100vh-8rem)]">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Messages</h1>

      <div className="flex h-[calc(100%-4rem)] gap-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        {/* Conversations list — full-width on mobile (hidden when conv selected), fixed sidebar on sm+ */}
        <div className={cn(
          'overflow-y-auto border-r border-gray-200 sm:w-72 sm:shrink-0',
          selectedConvId ? 'hidden sm:flex sm:flex-col' : 'flex flex-col w-full',
        )}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center"><LoadingSpinner /></div>
          ) : conversations && conversations.length > 0 ? (
            conversations.map((conv) => {
              const otherName = getOtherParticipant(conv);
              const isSelected = conv.id === selectedConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors hover:bg-gray-50',
                    isSelected && 'bg-infra-primary/5 border-r-2 border-infra-primary',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-infra-primary to-infra-primary text-sm font-semibold text-white shadow-sm shadow-infra-primary/20">
                      {getInitials(otherName ?? '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{otherName}</p>
                      {conv.lastMessage && (
                        <p className="truncate text-xs text-gray-500">{conv.lastMessage}</p>
                      )}
                    </div>
                    {conv.unreadCounts?.[user?.uid ?? ''] > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-infra-primary text-xs font-bold text-white">
                        {conv.unreadCounts[user?.uid ?? '']}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <MessageSquare className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No conversations yet</p>
              <Link
                href="/search"
                className="mt-1 text-xs font-medium text-infra-primary hover:underline"
              >
                Find professionals to message
              </Link>
            </div>
          )}
        </div>

        {/* Message panel */}
        {selectedConvId ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
              <button
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 sm:hidden"
                onClick={() => setSelectedConvId(null)}
                aria-label="Back to conversations"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-infra-primary to-infra-primary text-sm font-semibold text-white shadow-sm shadow-infra-primary/20">
                {getInitials(selectedConv ? (getOtherParticipant(selectedConv) ?? '') : '')}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {selectedConv ? getOtherParticipant(selectedConv) : ''}
                </p>
                {!connected && (
                  <p className="text-xs text-gray-500">Connecting...</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {socketError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{socketError.message}</span>
                </div>
              )}
              {displayMessages.map((msg) => {
                const isOwn = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                      isOwn ? 'bg-infra-primary text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm',
                    )}>
                      <p>{msg.content}</p>
                      <p className={cn('mt-1 text-xs', isOwn ? 'text-infra-primary/20' : 'text-gray-400')}>
                        {formatRelativeTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {otherUserTyping.length > 0 && (
                <div className="flex items-end gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-200" />
                  <div className="flex gap-1 rounded-2xl bg-gray-100 px-4 py-2">
                    <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
                    <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error message */}
            {sendError && (
              <div className="flex items-center gap-2 mx-3 mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-200 p-3 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-infra-primary focus:outline-none focus:ring-2 focus:ring-infra-primary/20"
                placeholder={connected ? 'Type a message...' : 'Connecting...'}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                disabled={!connected}
              />
              <Button
                onClick={handleSendMessage}
                loading={socketLoading}
                disabled={!newMessage.trim() || !connected}
                className="shrink-0 h-11 w-11 p-0"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="hidden sm:flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
            <MessageSquare className="h-12 w-12 text-gray-200" />
            <p className="text-gray-500">Select a conversation to start messaging</p>
          </div>
        )}
      </div>

      {/* Conversion nudge — slides from bottom-right on messaging block */}
      {nudge && (
        <ConversionNudge
          trigger={nudge.trigger}
          context={nudge.context}
          onDismiss={clearNudge}
        />
      )}
    </div>
  );
}
