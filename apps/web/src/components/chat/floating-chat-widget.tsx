'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { useChat } from '@/lib/chat/chat-context';
import { useUI } from '@/lib/store/ui-context';
import { ChatBubbleIcon, CloseIcon } from '../ui/icons';
import { ChatChannelList } from './chat-channel-list';
import { ChatMessageView } from './chat-message-view';

export function FloatingChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { chatWidgetState, setChatWidgetState } = useUI();
  const { selectedChannelId, setSelectedChannelId, selectedChannel, unreadTotal } = useChat();

  // Hide widget if on dedicated /chat page or unauthenticated
  if (pathname.startsWith('/chat') || !isAuthenticated) {
    return null;
  }

  // Hidden when closed
  if (chatWidgetState === 'closed') {
    return null;
  }

  // Minimized floating pill bar
  if (chatWidgetState === 'minimized') {
    return (
      <div
        data-testid="floating-chat-minimized"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 60,
        }}
      >
        <button
          type="button"
          onClick={() => setChatWidgetState('docked')}
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            fontSize: '13px',
            fontWeight: 700,
          }}
          aria-label="Mở cửa sổ trò chuyện"
        >
          <ChatBubbleIcon size={18} />
          <span>Trò chuyện</span>
          {unreadTotal > 0 && (
            <span
              style={{
                backgroundColor: 'var(--color-danger, #ef4444)',
                color: '#fff',
                borderRadius: 'var(--radius-full)',
                padding: '1px 6px',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Docked floating window (380px x 500px)
  return (
    <aside
      data-testid="floating-chat-docked"
      aria-label="Cửa sổ trò chuyện nổi SYNAPSE"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '380px',
        maxWidth: 'calc(100vw - 32px)',
        height: '520px',
        maxHeight: 'calc(100vh - 100px)',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg, 12px)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Dock Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {selectedChannelId && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setSelectedChannelId(null)}
              aria-label="Quay lại danh sách hội thoại"
              style={{ padding: '4px 6px', fontSize: '13px' }}
            >
              ←
            </button>
          )}
          <span
            style={{
              fontSize: '13.5px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {selectedChannelId && selectedChannel
              ? selectedChannel.name || `Hội thoại #${selectedChannel.id.slice(0, 6)}`
              : 'SYNAPSE Trò chuyện'}
          </span>
          {!selectedChannelId && unreadTotal > 0 && (
            <span
              style={{
                backgroundColor: 'var(--color-brand)',
                color: 'var(--text-inverse)',
                borderRadius: 'var(--radius-full)',
                padding: '1px 6px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {unreadTotal}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            className="btn-ghost"
            title="Mở toàn màn hình /chat"
            aria-label="Mở toàn màn hình"
            onClick={() => {
              setChatWidgetState('closed');
              router.push('/chat');
            }}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            ⤢
          </button>
          <button
            type="button"
            className="btn-ghost"
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
            onClick={() => setChatWidgetState('minimized')}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            —
          </button>
          <button
            type="button"
            className="btn-ghost"
            title="Đóng"
            aria-label="Đóng cửa sổ"
            onClick={() => setChatWidgetState('closed')}
            style={{ padding: '4px 8px' }}
          >
            <CloseIcon size={14} />
          </button>
        </div>
      </div>

      {/* Dock Content Body */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {selectedChannelId ? (
          <ChatMessageView onClose={() => setSelectedChannelId(null)} />
        ) : (
          <ChatChannelList compact />
        )}
      </div>
    </aside>
  );
}
