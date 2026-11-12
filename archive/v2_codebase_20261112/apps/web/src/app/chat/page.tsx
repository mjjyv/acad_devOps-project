'use client';

import type React from 'react';
import { useState } from 'react';
import { ChatRequestsPanel } from '@/components/chat/chat-requests-panel';
import { NewChatComposer } from '@/components/chat/new-chat-composer';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { ChatBubbleIcon } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth/auth-context';
import { useRealtimeChat } from '@/lib/hooks/use-realtime-chat';
import { useUI } from '@/lib/store/ui-context';

export default function FullscreenChatPage() {
  const { user, isAuthenticated, isLoading, openAuthModal } = useAuth();
  const { showToast } = useUI();

  const [tab, setTab] = useState<'channels' | 'requests'>('channels');
  const [messageDraft, setMessageDraft] = useState('');
  const [threadDraft, setThreadDraft] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  const chat = useRealtimeChat({
    isAuthenticated,
    currentUserId: user?.id,
    enabled: true,
  });

  const activeChannel = chat.channels.find((c) => c.id === chat.selectedChannelId) || null;

  const handleSendMain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageDraft.trim() || !chat.selectedChannelId) return;
    try {
      await chat.sendMessage(messageDraft.trim());
      setMessageDraft('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể gửi tin nhắn');
    }
  };

  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadDraft.trim() || !chat.threadParent) return;
    try {
      await chat.sendMessage(threadDraft.trim(), chat.threadParent.id);
      setThreadDraft('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể gửi phản hồi nhánh');
    }
  };

  const handleCancelSent = async (requestId: string) => {
    try {
      await chat.cancelSentRequest(requestId);
      showToast('Đã thu hồi lời mời trò chuyện');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể thu hồi lời mời');
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <div className="app-container">
        <LeftSidebar />

        <main className="main-content" style={{ maxWidth: '1120px', width: '100%' }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Đang kết nối không gian trò chuyện...
            </div>
          ) : !isAuthenticated ? (
            <div className="reddit-card" style={{ padding: '40px', textAlign: 'center' }}>
              <ChatBubbleIcon
                size={32}
                style={{ color: 'var(--color-brand)', margin: '0 auto 12px' }}
              />
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                Synapse Realtime Chat Pop-Out
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Đăng nhập để truy cập toàn bộ kênh Direct/Group, Chat Threads phân nhánh và SSE
                stream.
              </p>
              <button
                type="button"
                className="reddit-pill-btn primary"
                onClick={() => openAuthModal('login')}
              >
                Đăng nhập ngay
              </button>
            </div>
          ) : (
            <div
              className="reddit-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: chat.threadParent ? '260px 1fr 300px' : '260px 1fr',
                minHeight: 'calc(100vh - 130px)',
                maxHeight: 'calc(100vh - 110px)',
              }}
            >
              {/* Left Pane: Channels + Requests + Create Group */}
              <div
                style={{
                  borderRight: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'var(--bg-canvas)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}
                    >
                      Kênh Trò Chuyện
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: chat.sseConnected ? 'var(--color-success)' : 'var(--text-muted)',
                      }}
                    >
                      {chat.sseConnected ? '● SSE Online' : 'Connecting...'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="reddit-pill-btn"
                    style={{ height: '28px', fontSize: '11px' }}
                    onClick={() => setShowNewChat((p) => !p)}
                  >
                    + Chat mới
                  </button>
                </div>

                {showNewChat && (
                  <NewChatComposer
                    onStartDirect={chat.startDirectChat}
                    onCreateGroup={chat.createGroupChannel}
                    onCancel={() => setShowNewChat(false)}
                    onSuccess={(res) => {
                      setShowNewChat(false);
                      if (res.mode === 'direct' && res.isRequest) {
                        setTab('requests');
                        showToast(`Đã gửi yêu cầu trò chuyện tới u/${res.recipientUsername}`);
                      } else {
                        setTab('channels');
                        if (res.mode === 'group') showToast('Đã tạo nhóm chat mới');
                      }
                    }}
                  />
                )}

                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setTab('channels')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: 'none',
                      background: 'transparent',
                      borderBottom:
                        tab === 'channels'
                          ? '2px solid var(--color-brand)'
                          : '2px solid transparent',
                      color: tab === 'channels' ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Kênh ({chat.channels.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('requests')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: 'none',
                      background: 'transparent',
                      borderBottom:
                        tab === 'requests'
                          ? '2px solid var(--color-brand)'
                          : '2px solid transparent',
                      color: tab === 'requests' ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Requests ({chat.requests.length + chat.sentRequests.length})
                  </button>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {tab === 'channels' ? (
                    chat.channels.length === 0 ? (
                      <div
                        style={{
                          padding: '16px',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          alignItems: 'center',
                        }}
                      >
                        <span>Chưa có kênh chat nào. Hãy tìm người theo username để bắt đầu!</span>
                        <button
                          type="button"
                          className="reddit-pill-btn primary"
                          style={{ height: '28px', fontSize: '11px' }}
                          onClick={() => setShowNewChat(true)}
                        >
                          + Tìm người để chat
                        </button>
                      </div>
                    ) : (
                      chat.channels.map((ch) => {
                        const active = ch.id === chat.selectedChannelId;
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => chat.setSelectedChannelId(ch.id)}
                            style={{
                              textAlign: 'left',
                              padding: '10px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: active
                                ? 'var(--bg-surface-hover)'
                                : 'var(--bg-surface)',
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <strong
                                style={{
                                  fontSize: '13px',
                                  color: active ? 'var(--color-brand)' : 'var(--text-primary)',
                                }}
                              >
                                {ch.type === 'GROUP' ? '# ' : ''}
                                {ch.name || 'Direct Chat'}
                              </strong>
                              {ch.unreadCount > 0 && (
                                <span
                                  style={{
                                    backgroundColor: 'var(--color-brand)',
                                    color: '#30364F',
                                    borderRadius: '9999px',
                                    padding: '1px 6px',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                  }}
                                >
                                  {ch.unreadCount}
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                marginTop: '3px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {ch.lastMessage?.content || `${ch.membersCount} thành viên`}
                            </div>
                          </button>
                        );
                      })
                    )
                  ) : (
                    <ChatRequestsPanel
                      incoming={chat.requests}
                      sent={chat.sentRequests}
                      onRespond={async (requestId, status) => {
                        const res = await chat.respondRequest(requestId, status);
                        if (status === 'ACCEPTED' && res.channel) {
                          setTab('channels');
                        }
                      }}
                      onCancelSent={handleCancelSent}
                    />
                  )}
                </div>
              </div>

              {/* Center Pane: Messages Stream */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <h1 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {activeChannel
                        ? `${activeChannel.type === 'GROUP' ? '# ' : ''}${activeChannel.name || 'Direct Chat'}`
                        : 'Chọn một kênh trò chuyện'}
                    </h1>
                    {activeChannel && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {activeChannel.type} • {activeChannel.membersCount} thành viên
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {chat.loadingMessages ? (
                    <div
                      style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}
                    >
                      Đang tải tin nhắn...
                    </div>
                  ) : chat.messages.length === 0 ? (
                    <div
                      style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}
                    >
                      {activeChannel ? 'Hãy gửi tin nhắn đầu tiên!' : 'Chưa chọn kênh chat.'}
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
                            gap: '3px',
                          }}
                        >
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            u/{m.senderUsername} •{' '}
                            {new Date(m.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div
                            style={{
                              maxWidth: '72%',
                              padding: '10px 14px',
                              borderRadius: isSelf ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                              backgroundColor: isSelf ? 'var(--color-brand)' : 'var(--bg-input)',
                              color: isSelf ? '#30364F' : 'var(--text-primary)',
                              fontSize: '13.5px',
                              lineHeight: 1.45,
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
                              color: 'var(--color-brand)',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            {m.repliesCount > 0
                              ? `💬 ${m.repliesCount} phản hồi nhánh`
                              : 'Mở nhánh trả lời'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {chat.activeTypingUsers.length > 0 && (
                  <div
                    style={{ padding: '4px 16px', fontSize: '12px', color: 'var(--color-brand)' }}
                  >
                    {chat.activeTypingUsers.map((u) => `u/${u}`).join(', ')} đang nhập...
                  </div>
                )}

                <form
                  onSubmit={handleSendMain}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <input
                    type="text"
                    placeholder={activeChannel ? 'Nhập tin nhắn...' : 'Chọn kênh để nhắn tin'}
                    value={messageDraft}
                    disabled={!activeChannel || chat.sending}
                    onChange={(e) => {
                      setMessageDraft(e.target.value);
                      if (chat.selectedChannelId && e.target.value.trim()) {
                        chat.notifyTyping(chat.selectedChannelId);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!activeChannel || chat.sending || !messageDraft.trim()}
                    className="reddit-pill-btn primary"
                  >
                    Gửi
                  </button>
                </form>
              </div>

              {/* Right Pane: Chat Thread Drawer */}
              {chat.threadParent && (
                <div
                  style={{
                    borderLeft: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--bg-canvas)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <strong style={{ fontSize: '13px', color: 'var(--color-brand)' }}>
                      Chat Thread
                    </strong>
                    <button
                      type="button"
                      className="reddit-pill-btn"
                      style={{ height: '24px', fontSize: '11px' }}
                      onClick={chat.closeThread}
                    >
                      Đóng
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
                    }}
                  >
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface)',
                        borderLeft: '3px solid var(--color-brand)',
                        fontSize: '12.5px',
                      }}
                    >
                      <strong>u/{chat.threadParent.senderUsername}</strong>
                      <div style={{ marginTop: '4px' }}>{chat.threadParent.content}</div>
                    </div>

                    {chat.threadReplies.map((reply) => (
                      <div
                        key={reply.id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '12.5px',
                        }}
                      >
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          u/{reply.senderUsername}
                        </div>
                        <div style={{ marginTop: '2px' }}>{reply.content}</div>
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={handleSendThreadReply}
                    style={{
                      display: 'flex',
                      gap: '6px',
                      padding: '10px',
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
                        padding: '8px 10px',
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
                    >
                      Gửi
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
