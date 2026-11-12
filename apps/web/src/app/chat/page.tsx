'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ChatChannelList } from '@/components/chat/chat-channel-list';
import { ChatMessageView } from '@/components/chat/chat-message-view';
import { NewChatModal } from '@/components/chat/new-chat-modal';
import { AppShell } from '@/components/layout/app-shell';
import { ChatBubbleIcon, PlusIcon, ShieldIcon } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth/auth-context';
import { useChat } from '@/lib/chat/chat-context';

function ChatContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { selectedChannelId, setSelectedChannelId, channels } = useChat();
  const [newChatOpen, setNewChatOpen] = useState(false);

  // If a ?channel=xxx query param is provided, select it
  useEffect(() => {
    const channelParam = searchParams.get('channel');
    if (channelParam && channels.some((c) => c.id === channelParam)) {
      setSelectedChannelId(channelParam);
    }
  }, [searchParams, channels, setSelectedChannelId]);

  if (!isAuthenticated) {
    return (
      <AppShell hideRightRail>
        <div
          data-testid="chat-unauthenticated-banner"
          style={{
            maxWidth: '560px',
            margin: '60px auto',
            padding: '36px 24px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg, 12px)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-badge)',
              color: 'var(--color-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChatBubbleIcon size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
              SYNAPSE Realtime Chat
            </h1>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--text-secondary)',
                marginTop: '6px',
                lineHeight: 1.5,
              }}
            >
              Đăng nhập để kết nối với các kỹ sư, trao đổi kỹ thuật 1-1 qua hàng đợi Stranger
              Request, hoặc thảo luận nhóm thời gian thực.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => openAuthModal('login')}
            style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 700 }}
          >
            Đăng nhập ngay
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideRightRail wide>
      <div
        data-testid="chat-full-page"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 350px) 1fr',
          height: 'calc(100vh - var(--header-height) - 36px)',
          minHeight: '580px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Left Column: Channels List */}
        <div
          style={{
            height: '100%',
            overflow: 'hidden',
            borderRight: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <ChatChannelList />
        </div>

        {/* Right Column: Active Conversation or Welcome State */}
        <div
          style={{
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: 'var(--bg-subtle)',
          }}
        >
          {selectedChannelId ? (
            <ChatMessageView onClose={() => setSelectedChannelId(null)} />
          ) : (
            <div
              data-testid="chat-welcome-placeholder"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '32px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-canvas)',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-badge)',
                  color: 'var(--color-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                }}
              >
                <ChatBubbleIcon size={36} />
              </div>

              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                Chào mừng bạn đến với SYNAPSE Chat
              </h2>

              <p
                style={{
                  fontSize: '13.5px',
                  color: 'var(--text-secondary)',
                  maxWidth: '440px',
                  lineHeight: 1.6,
                  marginBottom: '24px',
                }}
              >
                Chọn một cuộc trò chuyện từ danh sách bên trái hoặc bắt đầu một cuộc hội thoại mới
                với các thành viên trong cộng đồng.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setNewChatOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                  }}
                >
                  <PlusIcon size={16} />
                  <span>Bắt đầu cuộc trò chuyện mới</span>
                </button>
              </div>

              <div
                style={{
                  marginTop: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldIcon size={14} />
                  <span>Bảo vệ chống Spam & Stranger Request</span>
                </div>
                <span>•</span>
                <div>Server-Sent Events RFC 8895</div>
                <span>•</span>
                <div>Binary Media Upload</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {newChatOpen && <NewChatModal onClose={() => setNewChatOpen(false)} />}
    </AppShell>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <AppShell hideRightRail>
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            Đang tải dữ liệu hội thoại...
          </div>
        </AppShell>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
