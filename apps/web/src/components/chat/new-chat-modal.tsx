'use client';

import type { PublicUserProfile } from '@acad/contracts';
import { type FormEvent, useEffect, useState } from 'react';
import { extractApiErrorMessage, getApiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useChat } from '@/lib/chat/chat-context';
import { useUI } from '@/lib/store/ui-context';
import { CloseIcon, SearchIcon, ShieldIcon } from '../ui/icons';

interface NewChatModalProps {
  open?: boolean;
  onClose: () => void;
  defaultRecipientUsername?: string;
}

export function NewChatModal({
  open = true,
  onClose,
  defaultRecipientUsername,
}: NewChatModalProps) {
  const { user } = useAuth();
  const { initiateDirect, createGroup } = useChat();
  const { showToast } = useUI();

  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState(defaultRecipientUsername || '');
  const [searchResults, setSearchResults] = useState<PublicUserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  // Direct state
  const [selectedRecipient, setSelectedRecipient] = useState<PublicUserProfile | null>(null);
  const [initialMessage, setInitialMessage] = useState('Xin chào, mình kết nối trao đổi nhé!');

  // Group state
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<PublicUserProfile[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultRecipientUsername) {
      setSearchQuery(defaultRecipientUsername);
    }
  }, [defaultRecipientUsername]);

  // Debounced user search
  useEffect(() => {
    const clean = searchQuery.trim();
    if (!clean) {
      setSearchResults([]);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const users = await getApiClient().searchUsers(clean, 10);
        if (active) {
          setSearchResults(users.filter((u) => u.id !== user?.id));
        }
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, user?.id]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (mode === 'direct') {
        if (!selectedRecipient) {
          setErrorMsg('Vui lòng chọn một người dùng để nhắn tin.');
          setSubmitting(false);
          return;
        }
        const res = await initiateDirect(selectedRecipient.id, initialMessage.trim());
        if (res.isRequest) {
          showToast(`Đã gửi lời mời trò chuyện tới u/${selectedRecipient.username}`, 'info');
        } else {
          showToast(`Đã mở cuộc trò chuyện với u/${selectedRecipient.username}`, 'success');
        }
        onClose();
      } else {
        if (!groupName.trim()) {
          setErrorMsg('Vui lòng nhập tên nhóm chat.');
          setSubmitting(false);
          return;
        }
        if (selectedGroupMembers.length === 0) {
          setErrorMsg('Vui lòng chọn ít nhất 1 thành viên vào nhóm.');
          setSubmitting(false);
          return;
        }
        await createGroup({
          name: groupName.trim(),
          memberIds: selectedGroupMembers.map((m) => m.id),
        });
        showToast(`Đã tạo nhóm chat "${groupName.trim()}"`, 'success');
        onClose();
      }
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'Không thể tạo cuộc trò chuyện'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGroupMember = (profile: PublicUserProfile) => {
    setSelectedGroupMembers((prev) => {
      const exists = prev.some((m) => m.id === profile.id);
      if (exists) return prev.filter((m) => m.id !== profile.id);
      return [...prev, profile];
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tạo cuộc trò chuyện mới"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        backgroundColor: 'rgba(14, 17, 28, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="surface-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: 'var(--shadow-floating)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Cuộc trò chuyện mới
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Tìm bạn bè theo username hoặc lập nhóm thảo luận
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            style={{ padding: '6px' }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Mode switcher */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={mode === 'direct' ? 'btn-primary' : 'btn-ghost'}
            style={{ flex: 1, padding: '7px 12px', fontSize: '13px' }}
          >
            Tin nhắn 1-1 (Direct)
          </button>
          <button
            type="button"
            onClick={() => setMode('group')}
            className={mode === 'group' ? 'btn-primary' : 'btn-ghost'}
            style={{ flex: 1, padding: '7px 12px', fontSize: '13px' }}
          >
            Tạo nhóm (Group)
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {mode === 'group' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Tên nhóm chat
              </span>
              <input
                type="text"
                required
                maxLength={128}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="vd: DevOps Incident Response"
                className="input-field"
              />
            </label>
          )}

          {/* User search box */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Tìm kiếm người dùng theo username
            </span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <SearchIcon
                size={15}
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                data-testid="search-user-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập username..."
                className="input-field"
                style={{ paddingLeft: '34px' }}
              />
            </div>
          </label>

          {/* Selected pills in group mode */}
          {mode === 'group' && selectedGroupMembers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedGroupMembers.map((m) => (
                <span
                  key={m.id}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-pill-hover)',
                    color: 'var(--color-brand)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  u/{m.username}
                  <button
                    type="button"
                    onClick={() => toggleGroupMember(m)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search results list */}
          {searching && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px' }}>
              Đang tìm người dùng...
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <div
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '6px',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              {searchResults.map((u) => {
                const isSelected =
                  mode === 'direct'
                    ? selectedRecipient?.id === u.id
                    : selectedGroupMembers.some((m) => m.id === u.id);

                return (
                  <button
                    key={u.id}
                    type="button"
                    data-testid={`user-search-result-${u.username}`}
                    onClick={() => {
                      if (mode === 'direct') {
                        setSelectedRecipient(u);
                      } else {
                        toggleGroupMember(u);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected
                        ? '1px solid var(--border-focus)'
                        : '1px solid transparent',
                      backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
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
                        {u.username.slice(0, 1).toUpperCase()}
                      </span>
                      <strong style={{ fontSize: '13px' }}>u/{u.username}</strong>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-brand)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <ShieldIcon size={10} />
                        {u.role}
                      </span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {u.karmaScore} karma
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Recipient indicator in Direct mode */}
          {mode === 'direct' && selectedRecipient && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-pill)',
                fontSize: '12.5px',
                color: 'var(--color-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                Người nhận: <strong>u/{selectedRecipient.username}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedRecipient(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Đổi
              </button>
            </div>
          )}

          {/* Initial Message in Direct mode */}
          {mode === 'direct' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Tin nhắn mở đầu
              </span>
              <textarea
                name="initialMessage"
                data-testid="initial-message-input"
                required
                rows={2}
                maxLength={1000}
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Gửi lời chào và giới thiệu ngắn gọn..."
                className="input-field"
              />
            </label>
          )}

          {errorMsg && (
            <div
              role="alert"
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                fontSize: '12.5px',
              }}
            >
              {errorMsg}
            </div>
          )}

          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}
          >
            <button type="button" className="btn-ghost" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              data-testid="submit-new-chat-btn"
              disabled={submitting || (mode === 'direct' && !selectedRecipient)}
              className="btn-primary"
            >
              {submitting
                ? 'Đang xử lý...'
                : mode === 'direct'
                  ? 'Gửi tin nhắn / Lời mời'
                  : 'Tạo nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
