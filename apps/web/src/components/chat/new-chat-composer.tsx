'use client';

import type { ChatChannel, ChatRequest, PublicUserProfile } from '@acad/contracts';
import type React from 'react';
import { useEffect, useState } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import { ChatApi } from '@/lib/api/chat';

interface NewChatComposerProps {
  initialMode?: 'direct' | 'group';
  compact?: boolean;
  onStartDirect: (
    recipientId: string,
    initialMessage: string,
  ) => Promise<
    { isRequest: true; request: ChatRequest } | { isRequest: false; channel: ChatChannel }
  >;
  onCreateGroup: (name: string, memberIds: string[]) => Promise<ChatChannel>;
  onSuccess?: (result: {
    mode: 'direct' | 'group';
    isRequest?: boolean;
    recipientUsername?: string;
  }) => void;
  onCancel?: () => void;
}

export function NewChatComposer({
  initialMode = 'direct',
  compact = false,
  onStartDirect,
  onCreateGroup,
  onSuccess,
  onCancel,
}: NewChatComposerProps) {
  const [mode, setMode] = useState<'direct' | 'group'>(initialMode);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PublicUserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<PublicUserProfile[]>([]);
  const [initialMessage, setInitialMessage] = useState('');
  const [groupName, setGroupName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const trimmed = query.trim().replace(/^u\//i, '');
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      void ChatApi.searchUsers(trimmed, 8)
        .then((users) => {
          if (!cancelled) {
            setResults(users);
          }
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelectUser = (user: PublicUserProfile) => {
    setErrorMsg(null);
    if (mode === 'direct') {
      setSelectedUsers([user]);
    } else if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, user]);
    }
    setQuery('');
    setResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleModeChange = (nextMode: 'direct' | 'group') => {
    setMode(nextMode);
    setErrorMsg(null);
    if (nextMode === 'direct' && selectedUsers.length > 1) {
      const first = selectedUsers[0];
      setSelectedUsers(first ? [first] : []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedUsers.length === 0) {
      setErrorMsg('Vui lòng tìm và chọn ít nhất 1 người dùng theo username.');
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'direct') {
        const target = selectedUsers[0];
        if (!target) return;
        const text = initialMessage.trim();
        if (!text) {
          setErrorMsg('Hãy nhập tin nhắn mở đầu để gửi yêu cầu trò chuyện.');
          return;
        }
        const res = await onStartDirect(target.id, text);
        setSelectedUsers([]);
        setInitialMessage('');
        onSuccess?.({
          mode: 'direct',
          isRequest: res.isRequest,
          recipientUsername: target.username,
        });
      } else {
        const cleanGroup = groupName.trim();
        if (cleanGroup.length < 2) {
          setErrorMsg('Tên nhóm cần ít nhất 2 ký tự.');
          return;
        }
        await onCreateGroup(
          cleanGroup,
          selectedUsers.map((u) => u.id),
        );
        setSelectedUsers([]);
        setGroupName('');
        onSuccess?.({ mode: 'group' });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể khởi tạo cuộc trò chuyện');
    } finally {
      setSubmitting(false);
    }
  };

  const unselectedResults = results.filter((r) => !selectedUsers.some((s) => s.id === r.id));

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: compact ? '10px 12px' : '12px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={() => handleModeChange('direct')}
            className={`reddit-pill-btn ${mode === 'direct' ? 'primary' : ''}`}
            style={{ height: '24px', fontSize: '11px', padding: '0 10px' }}
          >
            1-1 Direct
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('group')}
            className={`reddit-pill-btn ${mode === 'group' ? 'primary' : ''}`}
            style={{ height: '24px', fontSize: '11px', padding: '0 10px' }}
          >
            Group Chat
          </button>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Đóng khung tạo chat"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <CloseIcon size={14} />
          </button>
        )}
      </div>

      {mode === 'group' && (
        <input
          type="text"
          placeholder="Tên phòng chat nhóm (vd: SRE Incident Response)..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          style={{
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '12px',
          }}
        />
      )}

      {selectedUsers.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--color-brand)',
                color: 'var(--text-primary)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              u/{u.username}
              <button
                type="button"
                onClick={() => handleRemoveUser(u.id)}
                aria-label={`Bỏ u/${u.username}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Search for people by username to chat with them..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '12px',
          }}
        />
        {(searching ||
          unselectedResults.length > 0 ||
          (query.trim().length > 0 && !searching && results.length === 0)) && (
          <div
            style={{
              marginTop: '4px',
              maxHeight: '140px',
              overflowY: 'auto',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-canvas)',
            }}
          >
            {searching ? (
              <div style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Đang tìm thành viên...
              </div>
            ) : unselectedResults.length === 0 ? (
              <div style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Không tìm thấy thành viên nào khớp &ldquo;{query.trim()}&rdquo;.
              </div>
            ) : (
              unselectedResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUser(u)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '7px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border-subtle)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                >
                  <span>
                    <strong>u/{u.username}</strong>
                    <span
                      style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '11px' }}
                    >
                      • {u.role}
                    </span>
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-brand)', fontWeight: 700 }}>
                    + Chọn
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {mode === 'direct' && (
        <input
          type="text"
          placeholder="Lời chào / tin nhắn mở đầu..."
          value={initialMessage}
          onChange={(e) => setInitialMessage(e.target.value)}
          maxLength={2000}
          style={{
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '12px',
          }}
        />
      )}

      {errorMsg && <div style={{ fontSize: '11px', color: '#f43f5e' }}>{errorMsg}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
        {onCancel && (
          <button
            type="button"
            className="reddit-pill-btn"
            style={{ height: '26px', fontSize: '11px' }}
            onClick={onCancel}
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || selectedUsers.length === 0}
          className="reddit-pill-btn primary"
          style={{ height: '26px', fontSize: '11px' }}
        >
          {submitting ? 'Đang xử lý...' : mode === 'direct' ? 'Gửi tin nhắn' : 'Tạo nhóm chat'}
        </button>
      </div>
    </form>
  );
}
