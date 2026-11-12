'use client';

import type {
  ChatChannel,
  ChatMessage,
  ChatRequest,
  CreateGroupChannelInput,
} from '@acad/contracts';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChatApi } from '@/lib/api/chat';
import { STORAGE_KEY_ACCESS_TOKEN } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

interface TypingUser {
  userId: string;
  username: string;
  expiresAt: number;
}

interface ChatContextValue {
  channels: ChatChannel[];
  selectedChannelId: string | null;
  selectedChannel: ChatChannel | null;
  setSelectedChannelId: (id: string | null) => void;
  incomingRequests: ChatRequest[];
  sentRequests: ChatRequest[];
  unreadTotal: number;
  messages: ChatMessage[];
  loadingMessages: boolean;
  nextCursor: string | null;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (
    content: string,
    options?: { parentMessageId?: string; attachments?: ChatMessage['attachments'] },
  ) => Promise<ChatMessage>;
  initiateDirect: (
    recipientId: string,
    initialMessage: string,
  ) => Promise<{ isRequest: boolean; channel?: ChatChannel; request?: ChatRequest }>;
  respondRequest: (requestId: string, status: 'ACCEPTED' | 'IGNORED' | 'BLOCKED') => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  createGroup: (input: CreateGroupChannelInput) => Promise<ChatChannel>;
  markRead: (channelId: string) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  typingUsers: string[];
  onlineMap: Record<string, boolean>;
  refreshChannels: () => Promise<void>;
  refreshRequests: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useUI();

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<ChatRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ChatRequest[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [typingMap, setTypingMap] = useState<Record<string, TypingUser>>({});
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});

  const sseRef = useRef<EventSource | null>(null);
  const selectedChannelIdRef = useRef<string | null>(selectedChannelId);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<boolean>(false);

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId;
  }, [selectedChannelId]);

  // 1. Initial Load of Channels & Requests
  const refreshChannels = useCallback(async () => {
    if (!isAuthenticated) {
      setChannels([]);
      return;
    }
    try {
      const list = await ChatApi.getChannels();
      setChannels(list);
    } catch {
      // transient network or auth errors
    }
  }, [isAuthenticated]);

  const refreshRequests = useCallback(async () => {
    if (!isAuthenticated) {
      setIncomingRequests([]);
      setSentRequests([]);
      return;
    }
    try {
      const res = await ChatApi.getRequests('all');
      setIncomingRequests(Array.isArray(res.incoming) ? res.incoming : []);
      setSentRequests(Array.isArray(res.sent) ? res.sent : []);
    } catch {
      // transient
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshChannels();
      void refreshRequests();
    } else {
      setChannels([]);
      setSelectedChannelId(null);
      setIncomingRequests([]);
      setSentRequests([]);
      setMessages([]);
    }
  }, [isAuthenticated, refreshChannels, refreshRequests]);

  // 2. Load Messages for Active Channel
  const loadChannelMessages = useCallback(async (channelId: string, cursor?: string) => {
    try {
      if (!cursor) {
        setLoadingMessages(true);
      }
      const res = await ChatApi.getMessages(channelId, cursor);
      setMessages((prev) => (cursor ? [...res.messages, ...prev] : res.messages));
      setNextCursor(res.nextCursor);
    } catch {
      if (!cursor) setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChannelId) {
      void loadChannelMessages(selectedChannelId);
      void ChatApi.markChannelAsRead(selectedChannelId);
      setChannels((prev) =>
        prev.map((c) => (c.id === selectedChannelId ? { ...c, unreadCount: 0 } : c)),
      );
    } else {
      setMessages([]);
      setNextCursor(null);
    }
  }, [selectedChannelId, loadChannelMessages]);

  const loadMoreMessages = useCallback(async () => {
    if (!selectedChannelId || !nextCursor || loadingMessages) return;
    await loadChannelMessages(selectedChannelId, nextCursor);
  }, [selectedChannelId, nextCursor, loadingMessages, loadChannelMessages]);

  // 3. SSE Realtime Stream Connection
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
    if (!token) return;

    const sse = new EventSource(ChatApi.getSseUrl(token));
    sseRef.current = sse;

    sse.addEventListener('connected', () => {
      // connected successfully
    });

    sse.addEventListener('message:new', (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data) as ChatMessage;
        const isViewing = selectedChannelIdRef.current === msg.channelId;

        // Insert message if currently viewing this channel
        if (isViewing) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          void ChatApi.markChannelAsRead(msg.channelId, msg.id);
        }

        // Update lastMessage and unreadCount in channel list
        setChannels((prev) => {
          const exists = prev.some((c) => c.id === msg.channelId);
          if (!exists) {
            void refreshChannels();
            return prev;
          }
          return prev.map((c) => {
            if (c.id === msg.channelId) {
              return {
                ...c,
                lastMessage: msg,
                unreadCount: isViewing ? 0 : c.unreadCount + 1,
              };
            }
            return c;
          });
        });
      } catch {
        // ignore parse error
      }
    });

    sse.addEventListener('typing:update', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as {
          channelId: string;
          userId: string;
          username: string;
          isTyping: boolean;
        };
        if (data.userId === user?.id) return;

        setTypingMap((prev) => {
          const next = { ...prev };
          const key = `${data.channelId}:${data.userId}`;
          if (data.isTyping) {
            next[key] = {
              userId: data.userId,
              username: data.username,
              expiresAt: Date.now() + 3500,
            };
          } else {
            delete next[key];
          }
          return next;
        });
      } catch {
        // ignore
      }
    });

    sse.addEventListener('channel:created', (event: MessageEvent) => {
      try {
        const newChan = JSON.parse(event.data) as ChatChannel;
        setChannels((prev) => {
          if (prev.some((c) => c.id === newChan.id)) return prev;
          return [newChan, ...prev];
        });
      } catch {
        // ignore
      }
    });

    sse.addEventListener('chat_request:new', (event: MessageEvent) => {
      try {
        const req = JSON.parse(event.data) as ChatRequest;
        setIncomingRequests((prev) => [req, ...prev.filter((r) => r.id !== req.id)]);
        showToast(`Lời mời trò chuyện mới từ u/${req.senderUsername}`, 'info');
      } catch {
        // ignore
      }
    });

    sse.addEventListener('chat_request:updated', (event: MessageEvent) => {
      try {
        const req = JSON.parse(event.data) as ChatRequest;
        setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
        setSentRequests((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, status: req.status } : r)),
        );
        if (req.status === 'ACCEPTED') {
          void refreshChannels();
        }
      } catch {
        // ignore
      }
    });

    return () => {
      sse.close();
      sseRef.current = null;
    };
  }, [isAuthenticated, user?.id, refreshChannels, showToast]);

  // 4. Heartbeat (12s) & Periodic Presence Batch
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void ChatApi.sendPresenceHeartbeat();
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Periodic Presence update for members in channels
  useEffect(() => {
    if (!isAuthenticated || channels.length === 0) return;

    const checkPresence = async () => {
      const userIds = channels
        .map((c) => c.creatorId)
        .filter((id) => id && id !== user?.id)
        .slice(0, 30);
      if (userIds.length > 0) {
        try {
          const statuses = await ChatApi.getPresenceBatch(userIds);
          setOnlineMap((prev) => ({ ...prev, ...statuses }));
        } catch {
          // ignore
        }
      }
    };

    void checkPresence();
    const timer = setInterval(() => {
      void checkPresence();
    }, 20000);

    return () => clearInterval(timer);
  }, [isAuthenticated, channels, user?.id]);

  // 5. Actions
  const sendMessage = useCallback(
    async (
      content: string,
      options?: { parentMessageId?: string; attachments?: ChatMessage['attachments'] },
    ) => {
      if (!selectedChannelId) throw new Error('Chưa chọn kênh trò chuyện');
      const res = await ChatApi.sendMessage(selectedChannelId, content, options);
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev;
        return [...prev, res.message];
      });
      setChannels((prev) =>
        prev.map((c) => (c.id === selectedChannelId ? { ...c, lastMessage: res.message } : c)),
      );
      return res.message;
    },
    [selectedChannelId],
  );

  const initiateDirect = useCallback(async (recipientId: string, initialMessage: string) => {
    const res = await ChatApi.initiateDirectChat(recipientId, initialMessage);
    if (res.channel) {
      const channel = res.channel;
      setChannels((prev) => [channel, ...prev.filter((c) => c.id !== channel.id)]);
      setSelectedChannelId(channel.id);
    } else if (res.request) {
      const request = res.request;
      setSentRequests((prev) => [request, ...prev.filter((r) => r.id !== request.id)]);
    }
    return res;
  }, []);

  const respondRequest = useCallback(
    async (requestId: string, status: 'ACCEPTED' | 'IGNORED' | 'BLOCKED') => {
      const res = await ChatApi.respondRequest(requestId, status);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (res.channel) {
        const channel = res.channel;
        setChannels((prev) => [channel, ...prev.filter((c) => c.id !== channel.id)]);
        setSelectedChannelId(channel.id);
      }
    },
    [],
  );

  const cancelRequest = useCallback(async (requestId: string) => {
    await ChatApi.cancelChatRequest(requestId);
    setSentRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const createGroup = useCallback(async (input: CreateGroupChannelInput) => {
    const res = await ChatApi.createGroupChannel(input.name, input.memberIds);
    setChannels((prev) => [res.channel, ...prev]);
    setSelectedChannelId(res.channel.id);
    return res.channel;
  }, []);

  const markRead = useCallback(async (channelId: string) => {
    await ChatApi.markChannelAsRead(channelId);
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c)));
  }, []);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!selectedChannelId) return;

      if (isTyping) {
        if (!lastTypingSentRef.current) {
          lastTypingSentRef.current = true;
          void ChatApi.notifyTyping(selectedChannelId, true);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          lastTypingSentRef.current = false;
          void ChatApi.notifyTyping(selectedChannelId, false);
        }, 3000);
      } else {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        lastTypingSentRef.current = false;
        void ChatApi.notifyTyping(selectedChannelId, false);
      }
    },
    [selectedChannelId],
  );

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  );

  const unreadTotal = useMemo(() => {
    const channelUnreads = channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    return channelUnreads + incomingRequests.length;
  }, [channels, incomingRequests]);

  const activeTypingUsers = useMemo(() => {
    if (!selectedChannelId) return [];
    const now = Date.now();
    return Object.entries(typingMap)
      .filter(([key, u]) => key.startsWith(`${selectedChannelId}:`) && u.expiresAt > now)
      .map(([, u]) => u.username);
  }, [typingMap, selectedChannelId]);

  return (
    <ChatContext.Provider
      value={{
        channels,
        selectedChannelId,
        selectedChannel,
        setSelectedChannelId,
        incomingRequests,
        sentRequests,
        unreadTotal,
        messages,
        loadingMessages,
        nextCursor,
        loadMoreMessages,
        sendMessage,
        initiateDirect,
        respondRequest,
        cancelRequest,
        createGroup,
        markRead,
        sendTyping,
        typingUsers: activeTypingUsers,
        onlineMap,
        refreshChannels,
        refreshRequests,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return ctx;
}
