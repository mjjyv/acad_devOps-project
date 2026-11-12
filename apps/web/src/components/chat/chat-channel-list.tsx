'use client';

import type { ChatChannel } from '@acad/contracts';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useChat } from '@/lib/chat/chat-context';
import { ChatBubbleIcon, PlusIcon } from '../ui/icons';
import { NewChatModal } from './new-chat-modal';

interface ChatChannelListProps {
  compact?: boolean;
  onSelectChannel?: () => void;
}

export function ChatChannelList({ compact = false, onSelectChannel }: ChatChannelListProps) {
  const { user } = useAuth();
  const {
    channels,
    selectedChannelId,
    setSelectedChannelId,
    incomingRequests,
    sentRequests,
    respondRequest,
    cancelRequest,
    onlineMap,
  } = useChat();

  const [activeTab, setActiveTab] = useState<'channels' | 'requests'>('channels');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const handleSelectChannel = (channel: ChatChannel) => {
    setSelectedChannelId(channel.id);
    if (onSelectChannel) onSelectChannel();
  };

  const handleAction = async (requestId: string, action: 'ACCEPTED' | 'IGNORED' | 'BLOCKED') => {
    try {
      setRespondingId(requestId);
      await respondRequest(requestId, action);
    } finally {
      setRespondingId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      setRespondingId(requestId);
      await cancelRequest(requestId);
    } finally {
      setRespondingId(null);
    }
  };

  const formatChannelTitle = (channel: ChatChannel): string => {
    if (channel.name) return channel.name;
    // For direct channel, find sender or other member
    if (channel.lastMessage) {
      if (channel.lastMessage.senderId !== user?.id) {
        return `u/${channel.lastMessage.senderUsername}`;
      }
    }
    return `Hội thoại #${channel.id.slice(0, 6)}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-canvas)',
        borderRight: compact ? 'none' : '1px solid var(--border-subtle)',
      }}
    >
      {/* Top Header & New Chat button */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChatBubbleIcon size={18} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Tin nhắn & Chat
          </h2>
        </div>

        <button
          type="button"
          data-testid="new-chat-trigger-btn"
          onClick={() => setNewChatOpen(true)}
          className="btn-primary"
          style={{
            padding: '5px 10px',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <PlusIcon size={14} />
          <span>Hội thoại mới</span>
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-divider)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <button
          type="button"
          data-testid="chat-tab-channels"
          onClick={() => setActiveTab('channels')}
          style={{
            flex: 1,
            padding: '9px 12px',
            border: 'none',
            borderBottom:
              activeTab === 'channels' ? '2px solid var(--color-brand)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'channels' ? 'var(--color-brand)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: activeTab === 'channels' ? 700 : 500,
            cursor: 'pointer',
          }}
        >
          Trò chuyện ({channels.length})
        </button>

        <button
          type="button"
          data-testid="chat-tab-requests"
          onClick={() => setActiveTab('requests')}
          style={{
            flex: 1,
            padding: '9px 12px',
            border: 'none',
            borderBottom:
              activeTab === 'requests' ? '2px solid var(--color-brand)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'requests' ? 'var(--color-brand)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: activeTab === 'requests' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>Lời mời</span>
          {incomingRequests.length > 0 && (
            <span
              style={{
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-warning)',
                color: '#121622',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* List content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {activeTab === 'channels' ? (
          channels.length === 0 ? (
            <div
              data-testid="empty-channel-view"
              style={{
                padding: '28px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--text-secondary)',
              }}
            >
              <p style={{ fontSize: '13px' }}>Chưa có cuộc trò chuyện nào.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setNewChatOpen(true)}
                style={{ fontSize: '12.5px', padding: '6px 14px' }}
              >
                Tìm bạn để nhắn tin
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {channels.map((chan) => {
                const isSelected = selectedChannelId === chan.id;
                const isOnline = Boolean(onlineMap[chan.creatorId]);
                const title = formatChannelTitle(chan);

                return (
                  <button
                    key={chan.id}
                    type="button"
                    data-testid={`channel-item-${chan.id}`}
                    onClick={() => handleSelectChannel(chan)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected
                        ? '1px solid var(--border-focus)'
                        : '1px solid transparent',
                      backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--bg-badge)',
                          color: 'var(--color-brand)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {chan.type === 'GROUP'
                          ? 'G'
                          : title.replace(/^u\//, '').slice(0, 1).toUpperCase()}
                      </span>
                      {chan.type === 'DIRECT' && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: isOnline
                              ? 'var(--color-success)'
                              : 'var(--text-muted)',
                            border: '2px solid var(--bg-surface)',
                          }}
                        />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <strong
                          style={{
                            fontSize: '13.5px',
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {title}
                        </strong>
                        {chan.lastMessage && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(chan.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          marginTop: '2px',
                        }}
                      >
                        <p
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {chan.lastMessage
                            ? `${chan.lastMessage.senderUsername}: ${chan.lastMessage.content || '[Hình ảnh]'}`
                            : 'Chưa có tin nhắn'}
                        </p>
                        {chan.unreadCount > 0 && (
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'var(--color-brand)',
                              color: 'var(--text-inverse)',
                              fontSize: '11px',
                              fontWeight: 800,
                            }}
                          >
                            {chan.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Incoming Requests */}
            <div>
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Lời mời đến ({incomingRequests.length})
              </h3>
              {incomingRequests.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Không có lời mời nào đang chờ.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      data-testid={`incoming-request-${req.id}`}
                      className="surface-card"
                      style={{
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-brand)',
                            color: 'var(--text-inverse)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {req.senderUsername.slice(0, 1).toUpperCase()}
                        </span>
                        <strong style={{ fontSize: '13px' }}>u/{req.senderUsername}</strong>
                      </div>

                      <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', margin: 0 }}>
                        &ldquo;{req.initialMessage}&rdquo;
                      </p>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          data-testid={`accept-request-btn-${req.id}`}
                          disabled={respondingId === req.id}
                          onClick={() => handleAction(req.id, 'ACCEPTED')}
                          className="btn-primary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          Chấp nhận
                        </button>
                        <button
                          type="button"
                          data-testid={`ignore-request-btn-${req.id}`}
                          disabled={respondingId === req.id}
                          onClick={() => handleAction(req.id, 'IGNORED')}
                          className="btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Bỏ qua
                        </button>
                        <button
                          type="button"
                          data-testid={`block-request-btn-${req.id}`}
                          disabled={respondingId === req.id}
                          onClick={() => handleAction(req.id, 'BLOCKED')}
                          className="btn-ghost"
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            color: 'var(--color-danger)',
                          }}
                        >
                          Chặn
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Requests */}
            <div>
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Lời mời đã gửi ({sentRequests.length})
              </h3>
              {sentRequests.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Không có lời mời nào đã gửi.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {sentRequests.map((req) => (
                    <div
                      key={req.id}
                      className="surface-card"
                      style={{
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                          Tới: u/{req.receiverUsername || req.receiverId.slice(0, 6)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Trạng thái: {req.status}
                        </div>
                      </div>
                      {req.status === 'PENDING' && (
                        <button
                          type="button"
                          disabled={respondingId === req.id}
                          onClick={() => handleCancel(req.id)}
                          className="btn-ghost"
                          style={{ padding: '3px 8px', fontSize: '11.5px' }}
                        >
                          Hủy
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <NewChatModal open={newChatOpen} onClose={() => setNewChatOpen(false)} />
    </div>
  );
}
