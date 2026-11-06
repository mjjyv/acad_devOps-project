'use client';

import type React from 'react';
import { useState } from 'react';
import { useUI } from '../../lib/store/ui-context';
import { ChatBubbleIcon, CheckIcon, CloseIcon, ExternalLinkIcon } from '../ui/icons';

interface MockMessage {
  id: string;
  sender: string;
  avatar: string;
  content: string;
  time: string;
  isSelf?: boolean;
}

const INITIAL_MESSAGES: MockMessage[] = [
  {
    id: 'm1',
    sender: 'alice_sre',
    avatar: 'A',
    content: 'Cấu hình Cloudflare Tunnel trên Debian laptop của bạn đã kích hoạt chưa?',
    time: '10:14 AM',
  },
  {
    id: 'm2',
    sender: 'admin_pro',
    avatar: 'AD',
    content: 'Đã kích hoạt rồi! Đang chạy podman rootless PostgreSQL 16 và Redis 7 mượt mà.',
    time: '10:15 AM',
    isSelf: true,
  },
  {
    id: 'm3',
    sender: 'alice_sre',
    avatar: 'A',
    content: 'Tuyệt vời, latency < 20ms ngay trên localhost:10000. Sẵn sàng cho Phase F4 Chat SSE.',
    time: '10:16 AM',
  },
];

export function FloatingChatWidget() {
  const { chatWidgetState, setChatWidgetState, showToast } = useUI();
  const [messages, setMessages] = useState<MockMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'direct' | 'groups' | 'requests'>('direct');

  if (chatWidgetState === 'closed') return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: MockMessage = {
      id: `m_${Date.now()}`,
      sender: 'admin_pro',
      avatar: 'AD',
      content: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Simulate instant response from bot
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `m_rep_${Date.now()}`,
          sender: 'bot_devops',
          avatar: 'B',
          content: 'SSE Gateway RFC 8895: Tin nhắn đã được gửi qua event stream an toàn.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 800);
  };

  // State: MINIMIZED
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
          onClick={() => setChatWidgetState('docked')}
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
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-brand)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-strong)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ position: 'relative' }}>
            <ChatBubbleIcon size={18} style={{ color: 'var(--color-brand)' }} />
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-6px',
                backgroundColor: 'var(--color-brand)',
                color: '#ffffff',
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
              3
            </span>
          </div>
          <span>Acad Chat</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>▲</span>
        </button>
      </div>
    );
  }

  // State: DOCKED (380px x 520px)
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
      {/* 1. Chat Header */}
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
              Acad Realtime Chat
            </h4>
            <span style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 600 }}>
              SSE Stream Connected
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => showToast('Mở cửa sổ Chat Pop-out toàn màn hình (/chat)')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Pop-out Window"
          >
            <ExternalLinkIcon size={14} />
          </button>
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

      {/* 2. Conversation Tabs (Reddit Style: Direct / Groups / Requests) */}
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
          onClick={() => setActiveTab('direct')}
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
          Direct (2)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('groups')}
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
          Groups
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
          <span
            style={{
              backgroundColor: '#ff4500',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '9999px',
            }}
          >
            1
          </span>
        </button>
      </div>

      {/* 3. Messages Stream */}
      {activeTab === 'requests' ? (
        <div
          style={{
            flex: 1,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: 'var(--bg-canvas)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Hàng đợi duyệt tin nhắn từ người lạ (Stranger Requests Queue - Phase B4):
          </div>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                S
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                stranger_dev
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• 5m ago</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Chào bạn, tôi muốn trao đổi về bài viết tối ưu hóa HOT update fillfactor 70!
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => showToast('Đã chấp nhận yêu cầu trò chuyện (ACCEPTED)')}
                className="reddit-pill-btn primary"
                style={{ height: '26px', fontSize: '11px' }}
              >
                <CheckIcon size={12} /> Accept
              </button>
              <button
                type="button"
                onClick={() => showToast('Đã bỏ qua yêu cầu (IGNORED)')}
                className="reddit-pill-btn"
                style={{ height: '26px', fontSize: '11px' }}
              >
                Ignore
              </button>
            </div>
          </div>
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
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.isSelf ? 'flex-end' : 'flex-start',
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
                <span>{m.sender}</span>
                <span>•</span>
                <span>{m.time}</span>
              </div>
              <div
                style={{
                  maxWidth: '80%',
                  padding: '8px 12px',
                  borderRadius: m.isSelf ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  backgroundColor: m.isSelf ? 'var(--color-brand)' : 'var(--bg-surface)',
                  color: m.isSelf ? '#ffffff' : 'var(--text-primary)',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  border: m.isSelf ? 'none' : '1px solid var(--border-subtle)',
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Chat Input Bar */}
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
          placeholder="Message Alice..."
          value={inputText}
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
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-brand)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'transparent')}
        />
        <button
          type="submit"
          className="reddit-pill-btn primary"
          style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
