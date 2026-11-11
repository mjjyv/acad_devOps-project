'use client';

import type { ChatChannel, ChatMessage, ChatRequest } from '@acad/contracts';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatApi } from '@/lib/api/chat';
import { useAuth } from '../../lib/auth/auth-context';
import { useUI } from '../../lib/store/ui-context';
import { ChatBubbleIcon, CheckIcon, CloseIcon } from '../ui/icons';

export function FloatingChatWidget() {
  const { chatWidgetState, setChatWidgetState, showToast } = useUI();
  const { user, isAuthenticated, requireAuth } = useAuth();

  const [activeTab, setActiveTab] = useState<'direct' | 'groups' | 'requests'>('direct');
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [inputText, setInputText] = useState('');
  const [sseConnected, setSseConnected] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedChannelIdRef = useRef<string | null>(null);
  selectedChannelIdRef.current = selectedChannelId;

  const refreshChatMetadata = useCallback(async () => {
    if (!isAuthenticated) {
      setChannels([]);
      setRequests([]);
      setMessages([]);
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
      // Keep quiet on background sync errors
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refreshChatMetadata();
  }, [refreshChatMetadata]);

  useEffect(() => {
    if (!isAuthenticated || chatWidgetState !== 'docked' || !selectedChannelId) {
      return;
    }
    let isMounted = true;
    async function loadChannelMessages(channelId: string) {
      try {
        setLoadingMessages(true);
        const res = await ChatApi.listMessages(channelId, { limit: 50 });
        if (isMounted) {
          setMessages([...res.messages].reverse());
        }
      } catch {
        if (isMounted) setMessages([]);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    }
    void loadChannelMessages(selectedChannelId);
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, chatWidgetState, selectedChannelId]);

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

    es.addEventListener('chat:message_new', (event) => {
      try {
        const msg = JSON.parse((event as MessageEvent).data) as ChatMessage;
        if (msg.channelId === selectedChannelIdRef.current) {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
        void refreshChatMetadata();
      } catch {
        // Ignore malformed SSE payload
      }
    });

    es.addEventListener('chat_request:new', (event) => {
      try {
        const reqItem = JSON.parse((event as MessageEvent).data) as ChatRequest;
        setRequests((prev) => (prev.some((r) => r.id === reqItem.id) ? prev : [reqItem, ...prev]));
      } catch {
        // Ignore malformed SSE payload
      }
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      setSseConnected(false);
      es.close();
    };
  }, [isAuthenticated, refreshChatMetadata]);

  if (chatWidgetState === 'closed') return null;

  const directChannels = channels.filter((c) => c.type === 'DIRECT');
  const groupChannels = channels.filter((c) => c.type === 'GROUP');
  const visibleChannels = activeTab === 'groups' ? groupChannels : directChannels;
  const totalUnread = channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0);
  const badgeCount = totalUnread + requests.length;

  const handleOpenDock = () => {
    requireAuth(() => {
      setChatWidgetState('docked');
    }, 'Đăng nhập để tham gia nhắn tin thời gian thực');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChannelId || sending) return;

    const targetText = inputText.trim();
    requireAuth(async () => {
      try {
        setSending(true);
        const created = await ChatApi.sendMessage(selectedChannelId, targetText);
        setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
        setInputText('');
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Không thể gửi tin nhắn');
      } finally {
        setSending(false);
      }
    }, 'Đăng nhập để gửi tin nhắn');
  };

  const handleRespondRequest = async (
    requestId: string,
    status: 'ACCEPTED' | 'IGNORED' | 'BLOCKED',
  ) => {
    try {
      const res = await ChatApi.respondRequest(requestId, status);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      await refreshChatMetadata();
      if (status === 'ACCEPTED' && res.channel) {
        setSelectedChannelId(res.channel.id);
        setActiveTab('direct');
      }
      showToast(
        status === 'ACCEPTED'
          ? 'Đã chấp nhận yêu cầu trò chuyện'
          : status === 'BLOCKED'
            ? 'Đã chặn người gửi yêu cầu'
            : 'Đã bỏ qua yêu cầu',
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể xử lý yêu cầu');
    }
  };

  if (chatWidgetState === 'minimized') {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '24px',
          zIndex: 40,
        }}
        className="floating-chat-container"
      >
        <button
          type="button"
          onClick={handleOpenDock}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-full)',
            padding: '8px 16px',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-dropdown)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '13px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ position: 'relative' }}>
            <ChatBubbleIcon size={18} style={{ color: 'var(--color-brand)' }} />
            {badgeCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  backgroundColor: 'var(--color-brand)',
                  color: '#30364F',
                  fontSize: '9px',
                  fontWeight: 800,
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {badgeCount}
              </span>
            )}
          </div>
          <span>Synapse Chat</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>▲</span>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: '24px',
        width: '380px',
        height: '520px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderBottom: 'none',
        borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        boxShadow: 'var(--shadow-floating)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden',
      }}
      className="floating-chat-modal"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: '#161617',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="online-pulse" style={{ width: '8px', height: '8px' }} />
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Synapse Realtime Chat
            </h4>
            <span
              style={{
                fontSize: '10px',
                color: sseConnected ? 'var(--color-success)' : 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              {sseConnected ? 'SSE Stream Connected' : isAuthenticated ? 'Connecting...' : 'Guest'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setChatWidgetState('minimized')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '16px',
              lineHeight: 1,
            }}
            title="Minimize Chat"
          >
            _
          </button>
          <button
            type="button"
            onClick={() => setChatWidgetState('closed')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Close Chat"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-canvas)',
          fontSize: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('direct');
            if (directChannels[0]) setSelectedChannelId(directChannels[0].id);
          }}
          style={{
            flex: 1,
            padding: '8px 0',
            background: 'transparent',
            border: 'none',
            borderBottom:
              activeTab === 'direct' ? '2px solid var(--color-brand)' : '2px solid transparent',
            color: activeTab === 'direct' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'direct' ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          Direct ({directChannels.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('groups');
            if (groupChannels[0]) setSelectedChannelId(groupChannels[0].id);
          }}
          style={{
            flex: 1,
            padding: '8px 0',
            background: 'transparent',
            border: 'none',
            borderBottom:
              activeTab === 'groups' ? '2px solid var(--color-brand)' : '2px solid transparent',
            color: activeTab === 'groups' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'groups' ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          Groups ({groupChannels.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          style={{
            flex: 1,
            padding: '8px 0',
            background: 'transparent',
            border: 'none',
            borderBottom:
              activeTab === 'requests' ? '2px solid var(--color-brand)' : '2px solid transparent',
            color: activeTab === 'requests' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'requests' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <span>Requests</span>
          {requests.length > 0 && (
            <span
              style={{
                backgroundColor: 'var(--color-brand)',
                color: '#30364F',
                fontSize: '9px',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '9999px',
              }}
            >
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {/* Channel selector strip */}
      {activeTab !== 'requests' && visibleChannels.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '8px 12px',
            overflowX: 'auto',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          {visibleChannels.map((ch) => {
            const isSelected = ch.id === selectedChannelId;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedChannelId(ch.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--color-brand)' : 'var(--bg-input)',
                  color: isSelected ? '#30364F' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {ch.name || (ch.type === 'DIRECT' ? 'Direct Chat' : 'Group Chat')}
              </button>
            );
          })}
        </div>
      )}

      {/* Content body */}
      {!isAuthenticated ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            gap: '12px',
          }}
        >
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Đăng nhập để kết nối kênh trò chuyện thời gian thực.
          </p>
          <button type="button" className="reddit-pill-btn primary" onClick={handleOpenDock}>
            Đăng nhập
          </button>
        </div>
      ) : activeTab === 'requests' ? (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: 'var(--bg-canvas)',
          }}
        >
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              Không có yêu cầu trò chuyện nào đang chờ duyệt.
            </div>
          ) : (
            requests.map((reqItem) => (
              <div
                key={reqItem.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#30364F',
                      color: '#F0F0DB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    {reqItem.senderUsername.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    u/{reqItem.senderUsername}
                  </span>
                </div>
                <p
                  style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}
                >
                  {reqItem.initialMessage}
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => void handleRespondRequest(reqItem.id, 'ACCEPTED')}
                    className="reddit-pill-btn primary"
                    style={{ height: '26px', fontSize: '11px' }}
                  >
                    <CheckIcon size={12} /> Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRespondRequest(reqItem.id, 'IGNORED')}
                    className="reddit-pill-btn"
                    style={{ height: '26px', fontSize: '11px' }}
                  >
                    Ignore
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRespondRequest(reqItem.id, 'BLOCKED')}
                    className="reddit-pill-btn"
                    style={{ height: '26px', fontSize: '11px', color: '#f43f5e' }}
                  >
                    Block
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: 'var(--bg-canvas)',
          }}
        >
          {loadingMessages ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              Đang tải lịch sử trò chuyện...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              {selectedChannelId
                ? 'Chưa có tin nhắn nào trong kênh này.'
                : 'Bạn chưa tham gia kênh chat nào.'}
            </div>
          ) : (
            messages.map((m) => {
              const isSelf = m.senderId === user?.id;
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isSelf ? 'flex-end' : 'flex-start',
                    gap: '2px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>u/{m.senderUsername}</span>
                    <span>•</span>
                    <span>
                      {new Date(m.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '8px 12px',
                      borderRadius: isSelf ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      backgroundColor: isSelf ? 'var(--color-brand)' : 'var(--bg-surface)',
                      color: isSelf ? '#30364F' : 'var(--text-primary)',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      border: isSelf ? 'none' : '1px solid var(--border-subtle)',
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Input Bar */}
      {isAuthenticated && activeTab !== 'requests' && (
        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <input
            type="text"
            placeholder={selectedChannelId ? 'Nhập tin nhắn...' : 'Chọn kênh chat trước'}
            value={inputText}
            disabled={!selectedChannelId || sending}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              height: '36px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-primary)',
              padding: '0 14px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!selectedChannelId || sending || !inputText.trim()}
            className="reddit-pill-btn primary"
            style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
