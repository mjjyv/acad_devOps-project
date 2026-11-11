'use client';

import type { ChatChannel, ChatMessage, ChatRequest } from '@acad/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatApi } from '@/lib/api/chat';
import { CommunityApi } from '@/lib/api/community';

interface TypingEntry {
  username: string;
  expiresAt: number;
}

export function useRealtimeChat(options: {
  isAuthenticated: boolean;
  currentUserId?: string;
  enabled?: boolean;
}) {
  const { isAuthenticated, currentUserId, enabled = true } = options;

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [threadParent, setThreadParent] = useState<ChatMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<ChatMessage[]>([]);
  const [typingByChannel, setTypingByChannel] = useState<
    Record<string, Record<string, TypingEntry>>
  >({});

  const [sseConnected, setSseConnected] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedChannelIdRef = useRef<string | null>(null);
  const threadParentIdRef = useRef<string | null>(null);
  const lastTypingSentAtRef = useRef<number>(0);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  selectedChannelIdRef.current = selectedChannelId;
  threadParentIdRef.current = threadParent?.id ?? null;

  const refreshMetadata = useCallback(async () => {
    if (!isAuthenticated) {
      setChannels([]);
      setRequests([]);
      setMessages([]);
      setThreadParent(null);
      setThreadReplies([]);
      setSelectedChannelId(null);
      return;
    }

    try {
      const [loadedChannels, loadedRequests] = await Promise.all([
        ChatApi.listChannels(),
        ChatApi.listRequests(),
      ]);
      setChannels(loadedChannels);
      setRequests(loadedRequests);

      if (!selectedChannelIdRef.current && loadedChannels.length > 0) {
        setSelectedChannelId(loadedChannels[0]?.id ?? null);
      }
    } catch {
      // Keep previous list on transient failures
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refreshMetadata();
  }, [refreshMetadata]);

  // Load main channel messages when selectedChannelId changes
  useEffect(() => {
    if (!isAuthenticated || !enabled || !selectedChannelId) {
      return;
    }
    let isMounted = true;
    async function loadMessages(channelId: string) {
      try {
        setLoadingMessages(true);
        setThreadParent(null);
        setThreadReplies([]);
        const res = await ChatApi.listMessages(channelId, {
          limit: 50,
          parentMessageId: null,
        });
        if (isMounted) {
          setMessages([...res.messages].reverse());
        }
      } catch {
        if (isMounted) setMessages([]);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    }
    void loadMessages(selectedChannelId);
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, enabled, selectedChannelId]);

  // Presence Heartbeat every 12s while authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    void ChatApi.sendPresenceHeartbeat();
    const timer = setInterval(() => {
      void ChatApi.sendPresenceHeartbeat();
    }, 12000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  // Expire stale typing indicators
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTypingByChannel((prev) => {
        let changed = false;
        const next: Record<string, Record<string, TypingEntry>> = {};
        for (const [chId, usersMap] of Object.entries(prev)) {
          const kept: Record<string, TypingEntry> = {};
          for (const [uid, entry] of Object.entries(usersMap)) {
            if (entry.expiresAt > now) {
              kept[uid] = entry;
            } else {
              changed = true;
            }
          }
          if (Object.keys(kept).length > 0) {
            next[chId] = kept;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real SSE EventSource listener matching ChatService events
  useEffect(() => {
    if (!isAuthenticated) {
      setSseConnected(false);
      return;
    }

    const es = ChatApi.openEventStream();
    if (!es) return;

    es.addEventListener('connected', () => {
      setSseConnected(true);
    });

    es.addEventListener('message:new', (event) => {
      try {
        const msg = JSON.parse((event as MessageEvent).data) as ChatMessage;

        // Clear sender's typing status immediately
        setTypingByChannel((prev) => {
          const channelMap = prev[msg.channelId];
          if (!channelMap?.[msg.senderId]) return prev;
          const updated = { ...channelMap };
          delete updated[msg.senderId];
          return { ...prev, [msg.channelId]: updated };
        });

        if (msg.channelId === selectedChannelIdRef.current) {
          if (msg.parentMessageId) {
            setMessages((prev) =>
              prev.map((root) =>
                root.id === msg.parentMessageId
                  ? { ...root, repliesCount: (root.repliesCount || 0) + 1 }
                  : root,
              ),
            );
            if (msg.parentMessageId === threadParentIdRef.current) {
              setThreadReplies((prev) =>
                prev.some((r) => r.id === msg.id) ? prev : [...prev, msg],
              );
            }
          } else {
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          }
        }
        void refreshMetadata();
      } catch {
        // Ignore malformed SSE JSON
      }
    });

    es.addEventListener('chat_request:new', (event) => {
      try {
        const reqItem = JSON.parse((event as MessageEvent).data) as ChatRequest;
        setRequests((prev) => (prev.some((r) => r.id === reqItem.id) ? prev : [reqItem, ...prev]));
      } catch {
        // Ignore malformed SSE JSON
      }
    });

    es.addEventListener('chat_request:updated', (event) => {
      try {
        const updatedReq = JSON.parse((event as MessageEvent).data) as ChatRequest;
        setRequests((prev) => prev.filter((r) => r.id !== updatedReq.id));
        void refreshMetadata();
      } catch {
        // Ignore malformed SSE JSON
      }
    });

    es.addEventListener('channel:created', () => {
      void refreshMetadata();
    });

    es.addEventListener('typing:update', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          channelId: string;
          userId: string;
          username: string;
          isTyping: boolean;
        };
        if (payload.userId === currentUserId) return;

        setTypingByChannel((prev) => {
          const existing = { ...(prev[payload.channelId] || {}) };
          if (payload.isTyping) {
            existing[payload.userId] = {
              username: payload.username,
              expiresAt: Date.now() + 4000,
            };
          } else {
            delete existing[payload.userId];
          }
          return { ...prev, [payload.channelId]: existing };
        });
      } catch {
        // Ignore malformed SSE JSON
      }
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      setSseConnected(false);
      es.close();
    };
  }, [isAuthenticated, currentUserId, refreshMetadata]);

  const notifyTyping = useCallback((channelId: string) => {
    const now = Date.now();
    if (now - lastTypingSentAtRef.current >= 1500) {
      lastTypingSentAtRef.current = now;
      void ChatApi.sendTyping(channelId, true);
    }
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }
    typingStopTimerRef.current = setTimeout(() => {
      void ChatApi.sendTyping(channelId, false);
    }, 2500);
  }, []);

  const openThread = useCallback(async (parentMsg: ChatMessage) => {
    setThreadParent(parentMsg);
    setLoadingThread(true);
    try {
      const res = await ChatApi.listMessages(parentMsg.channelId, {
        limit: 50,
        parentMessageId: parentMsg.id,
      });
      setThreadReplies([...res.messages].reverse());
    } catch {
      setThreadReplies([]);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const closeThread = useCallback(() => {
    setThreadParent(null);
    setThreadReplies([]);
  }, []);

  const sendMessage = useCallback(
    async (content: string, parentMessageId?: string) => {
      if (!selectedChannelId || !content.trim() || sending) return null;
      setSending(true);
      try {
        if (typingStopTimerRef.current) {
          clearTimeout(typingStopTimerRef.current);
        }
        void ChatApi.sendTyping(selectedChannelId, false);

        const created = await ChatApi.sendMessage(
          selectedChannelId,
          content.trim(),
          parentMessageId,
        );
        if (parentMessageId) {
          setThreadReplies((prev) =>
            prev.some((r) => r.id === created.id) ? prev : [...prev, created],
          );
          setMessages((prev) =>
            prev.map((m) =>
              m.id === parentMessageId ? { ...m, repliesCount: (m.repliesCount || 0) + 1 } : m,
            ),
          );
        } else {
          setMessages((prev) =>
            prev.some((m) => m.id === created.id) ? prev : [...prev, created],
          );
        }
        void refreshMetadata();
        return created;
      } finally {
        setSending(false);
      }
    },
    [selectedChannelId, sending, refreshMetadata],
  );

  const respondRequest = useCallback(
    async (requestId: string, status: 'ACCEPTED' | 'IGNORED' | 'BLOCKED') => {
      const res = await ChatApi.respondRequest(requestId, status);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      await refreshMetadata();
      if (status === 'ACCEPTED' && res.channel) {
        setSelectedChannelId(res.channel.id);
      }
      return res;
    },
    [refreshMetadata],
  );

  const createGroupByUsernames = useCallback(
    async (name: string, rawUsernames: string) => {
      const cleanNames = rawUsernames
        .split(',')
        .map((s) => s.trim().replace(/^u\//i, ''))
        .filter(Boolean);

      if (cleanNames.length === 0) {
        throw new Error('Vui lòng nhập ít nhất 1 username thành viên (cách nhau bằng dấu phẩy).');
      }

      const profiles = await Promise.all(
        cleanNames.map(async (uname) => {
          const prof = await CommunityApi.getPublicUserProfile(uname);
          if (!prof) {
            throw new Error(`Không tìm thấy người dùng u/${uname}`);
          }
          return prof;
        }),
      );

      const channel = await ChatApi.createGroupChannel(
        name.trim(),
        profiles.map((p) => p.id),
      );
      await refreshMetadata();
      setSelectedChannelId(channel.id);
      return channel;
    },
    [refreshMetadata],
  );

  const activeTypingUsers = selectedChannelId
    ? Object.values(typingByChannel[selectedChannelId] || {}).map((e) => e.username)
    : [];

  return {
    channels,
    selectedChannelId,
    setSelectedChannelId,
    messages,
    requests,
    threadParent,
    threadReplies,
    openThread,
    closeThread,
    sseConnected,
    loadingMessages,
    loadingThread,
    sending,
    activeTypingUsers,
    notifyTyping,
    sendMessage,
    respondRequest,
    createGroupByUsernames,
    refreshMetadata,
  };
}
