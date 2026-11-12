'use client';

import type { ChatRequest } from '@acad/contracts';
import { CheckIcon } from '@/components/ui/icons';

interface ChatRequestsPanelProps {
  incoming: ChatRequest[];
  sent: ChatRequest[];
  onRespond: (
    requestId: string,
    status: 'ACCEPTED' | 'IGNORED' | 'BLOCKED',
  ) => Promise<void> | void;
  onCancelSent: (requestId: string) => Promise<void> | void;
  compact?: boolean;
}

export function ChatRequestsPanel({
  incoming,
  sent,
  onRespond,
  onCancelSent,
  compact = false,
}: ChatRequestsPanelProps) {
  const pad = compact ? '12px' : '10px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          fontSize: '11px',
          lineHeight: 1.45,
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 10px',
        }}
      >
        Tin nhắn mở đầu từ người lạ cần được đồng ý trước khi mở kênh chat trực tiếp 1-1.
      </div>

      {/* Incoming Requests */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Yêu cầu đến ({incoming.length})
        </div>

        {incoming.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 0' }}>
            Chưa có lời mời trò chuyện mới gửi đến bạn.
          </div>
        ) : (
          incoming.map((reqItem) => (
            <div
              key={reqItem.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                padding: pad,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
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
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  u/{reqItem.senderUsername}
                </span>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                {reqItem.initialMessage}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => void onRespond(reqItem.id, 'ACCEPTED')}
                  className="reddit-pill-btn primary"
                  style={{ height: '24px', fontSize: '11px' }}
                >
                  <CheckIcon size={11} /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => void onRespond(reqItem.id, 'IGNORED')}
                  className="reddit-pill-btn"
                  style={{ height: '24px', fontSize: '11px' }}
                >
                  Ignore
                </button>
                <button
                  type="button"
                  onClick={() => void onRespond(reqItem.id, 'BLOCKED')}
                  className="reddit-pill-btn"
                  style={{ height: '24px', fontSize: '11px', color: '#f43f5e' }}
                >
                  Block
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sent Requests */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Đã gửi ({sent.length})
        </div>

        {sent.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 0' }}>
            Bạn chưa có yêu cầu đang chờ phản hồi nào.
          </div>
        ) : (
          sent.map((reqItem) => (
            <div
              key={reqItem.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                padding: pad,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Tới u/{reqItem.receiverUsername || 'member'}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--color-brand)',
                  }}
                >
                  Đang chờ duyệt
                </span>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                }}
              >
                {reqItem.initialMessage}
              </p>
              <button
                type="button"
                onClick={() => void onCancelSent(reqItem.id)}
                className="reddit-pill-btn"
                style={{ height: '24px', fontSize: '11px' }}
              >
                Thu hồi lời mời
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
