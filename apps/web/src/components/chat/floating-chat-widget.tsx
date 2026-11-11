'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { useRealtimeChat } from '@/lib/hooks/use-realtime-chat';
import { useAuth } from '../../lib/auth/auth-context';
import { useUI } from '../../lib/store/ui-context';
import { ChatBubbleIcon, CheckIcon, CloseIcon, ExternalLinkIcon } from '../ui/icons';

export function FloatingChatWidget() {
  const pathname = usePathname();
  const { chatWidgetState, setChatWidgetState, showToast } = useUI();
  const { user, isAuthenticated, requireAuth } = useAuth();

  const [activeTab, setActiveTab] = useState<'direct' | 'groups' | 'requests'>('direct');
  const [inputText, setInputText] = useState('');
  const [threadDraft, setThreadDraft] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembersInput, setGroupMembersInput] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const chat = useRealtimeChat({
    isAuthenticated,
    currentUserId: user?.id,
    enabled: chatWidgetState === 'docked' && pathname !== '/chat',
  });

  if (pathname === '/chat' || chatWidgetState === 'closed') return null;

  const directChannels = chat.channels.filter((c) => c.type === 'DIRECT');
  const groupChannels = chat.channels.filter((c) => c.type === 'GROUP');
  const visibleChannels = activeTab === 'groups' ? groupChannels : directChannels;
  const totalUnread = chat.channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0);
  const badgeCount = totalUnread + chat.requests.length;

  const handleOpenDock = () => {
    requireAuth(() => {
      setChatWidgetState('docked');
    }, 'Đăng nhập để tham gia nhắn tin thời gian thực');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chat.selectedChannelId) return;
    const text = inputText.trim();
    try {
      await chat.sendMessage(text);
      setInputText('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể gửi tin nhắn');
    }
  };

  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadDraft.trim() || !chat.threadParent) return;
    const text = threadDraft.trim();
    try {
      await chat.sendMessage(text, chat.threadParent.id);
      setThreadDraft('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể gửi phản hồi nhánh');
    }
  };

  const handleRespondRequest = async (
    requestId: string,
    status: 'ACCEPTED' | 'IGNORED' | 'BLOCKED',
  ) => {
    try {
      const res = await chat.respondRequest(requestId, status);
      if (status === 'ACCEPTED' && res.channel) {
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

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      setCreatingGroup(true);
      await chat.createGroupByUsernames(groupName, groupMembersInput);
      setGroupName('');
      setGroupMembersInput('');
      setShowCreateGroup(false);
      setActiveTab('groups');
      showToast('Đã tạo nhóm chat mới');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể tạo nhóm chat');
    } finally {
      setCreatingGroup(false);
    }
  };

  if (chatWidgetState === 'minimized') {
    return (
      <div
        style={{ position: 'fixed', bottom: '16px', right: '24px', zIndex: 40 }}
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
        width: '390px',
        height: '540px',
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
                color: chat.sseConnected ? 'var(--color-success)' : 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              {chat.sseConnected
                ? 'SSE Stream Connected'
                : isAuthenticated
                  ? 'Connecting...'
                  : 'Guest'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link
            href="/chat"
            onClick={() => setChatWidgetState('minimized')}
            style={{ color: 'var(--text-muted)', padding: '4px', display: 'flex' }}
            title="Mở toàn màn hình (/chat)"
          >
            <ExternalLinkIcon size={14} />
          </Link>
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
            setShowCreateGroup(false);
            if (directChannels[0]) chat.setSelectedChannelId(directChannels[0].id);
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
            if (groupChannels[0]) chat.setSelectedChannelId(groupChannels[0].id);
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
          onClick={() => {
            setActiveTab('requests');
            setShowCreateGroup(false);
          }}
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
          {chat.requests.length > 0 && (
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
              {chat.requests.length}
            </span>
          )}
        </button>
      </div>

      {/* Channel selector strip */}
      {isAuthenticated && activeTab !== 'requests' && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '8px 12px',
            overflowX: 'auto',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            alignItems: 'center',
          }}
        >
          {activeTab === 'groups' && (
            <button
              type="button"
              onClick={() => setShowCreateGroup((p) => !p)}
              style={{
                padding: '4px 10px',
                borderRadius: '9999px',
                border: '1px dashed var(--color-brand)',
                backgroundColor: 'transparent',
                color: 'var(--color-brand)',
                fontSize: '11px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              + Nhóm
            </button>
          )}
          {visibleChannels.map((ch) => {
            const isSelected = ch.id === chat.selectedChannelId;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => chat.setSelectedChannelId(ch.id)}
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
                {ch.unreadCount > 0 ? ` (${ch.unreadCount})` : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* Create Group inline drawer */}
      {showCreateGroup && activeTab === 'groups' && (
        <form
          onSubmit={handleCreateGroup}
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--bg-input)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <input
            type="text"
            required
            placeholder="Tên phòng chat nhóm..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12px',
            }}
          />
          <input
            type="text"
            required
            placeholder="Thành viên (vd: admin_pro, devops_coder)"
            value={groupMembersInput}
            onChange={(e) => setGroupMembersInput(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            <button
              type="button"
              className="reddit-pill-btn"
              style={{ height: '26px', fontSize: '11px' }}
              onClick={() => setShowCreateGroup(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creatingGroup}
              className="reddit-pill-btn primary"
              style={{ height: '26px', fontSize: '11px' }}
            >
              {creatingGroup ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </div>
        </form>
      )}

      {/* Body */}
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
          {chat.requests.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              Không có yêu cầu trò chuyện nào đang chờ duyệt.
            </div>
          ) : (
            chat.requests.map((reqItem) => (
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
      ) : chat.threadParent ? (
        /* Sub-thread Drawer */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-input)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
            }}
          >
            <strong style={{ color: 'var(--color-brand)' }}>
              Nhánh của u/{chat.threadParent.senderUsername}
            </strong>
            <button
              type="button"
              onClick={chat.closeThread}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              ← Quay lại kênh
            </button>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              backgroundColor: 'var(--bg-canvas)',
            }}
          >
            <div
              style={{
                padding: '8px 10px',
                borderLeft: '2px solid var(--color-brand)',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
              }}
            >
              <strong style={{ color: 'var(--text-primary)' }}>
                u/{chat.threadParent.senderUsername}:
              </strong>{' '}
              {chat.threadParent.content}
            </div>
            {chat.loadingThread ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                Đang tải nhánh phản hồi...
              </div>
            ) : chat.threadReplies.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                Chưa có phản hồi trong nhánh này.
              </div>
            ) : (
              chat.threadReplies.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                  }}
                >
                  <div
                    style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}
                  >
                    u/{r.senderUsername}
                  </div>
                  <div style={{ color: 'var(--text-primary)' }}>{r.content}</div>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={handleSendThreadReply}
            style={{
              display: 'flex',
              gap: '6px',
              padding: '8px 10px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <input
              type="text"
              placeholder="Trả lời trong nhánh..."
              value={threadDraft}
              onChange={(e) => setThreadDraft(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
            <button
              type="submit"
              disabled={chat.sending || !threadDraft.trim()}
              className="reddit-pill-btn primary"
              style={{ height: '30px', fontSize: '11px' }}
            >
              Gửi
            </button>
          </form>
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
          {chat.loadingMessages ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              Đang tải lịch sử trò chuyện...
            </div>
          ) : chat.messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              {chat.selectedChannelId
                ? 'Chưa có tin nhắn nào trong kênh này.'
                : 'Bạn chưa tham gia kênh chat nào.'}
            </div>
          ) : (
            chat.messages.map((m) => {
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
                      maxWidth: '82%',
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
                  <button
                    type="button"
                    onClick={() => void chat.openThread(m)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--text-muted)',
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    {m.repliesCount > 0 ? `💬 ${m.repliesCount} phản hồi` : 'Trả lời nhánh'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Typing bar & Input Bar */}
      {isAuthenticated && activeTab !== 'requests' && !chat.threadParent && (
        <>
          {chat.activeTypingUsers.length > 0 && (
            <div
              style={{
                padding: '3px 14px',
                fontSize: '11px',
                color: 'var(--color-brand)',
                backgroundColor: 'var(--bg-canvas)',
              }}
            >
              {chat.activeTypingUsers.map((u) => `u/${u}`).join(', ')} đang nhập...
            </div>
          )}
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
              placeholder={chat.selectedChannelId ? 'Nhập tin nhắn...' : 'Chọn kênh chat trước'}
              value={inputText}
              disabled={!chat.selectedChannelId || chat.sending}
              onChange={(e) => {
                setInputText(e.target.value);
                if (chat.selectedChannelId && e.target.value.trim()) {
                  chat.notifyTyping(chat.selectedChannelId);
                }
              }}
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
              disabled={!chat.selectedChannelId || chat.sending || !inputText.trim()}
              className="reddit-pill-btn primary"
              style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
