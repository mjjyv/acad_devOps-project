'use client';

import type { ChatAttachment, ChatMessage } from '@acad/contracts';
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { extractApiErrorMessage } from '@/lib/api/client';
import { CommunityApi, resolveRenderableMediaUrl } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { useChat } from '@/lib/chat/chat-context';
import { useUI } from '@/lib/store/ui-context';
import { CloseIcon, ImageIcon } from '../ui/icons';

interface ChatMessageViewProps {
  onClose?: () => void;
}

export function ChatMessageView({ onClose }: ChatMessageViewProps) {
  const { user } = useAuth();
  const { showToast } = useUI();
  const {
    selectedChannel,
    messages,
    loadingMessages,
    nextCursor,
    loadMoreMessages,
    sendMessage,
    sendTyping,
    typingUsers,
    onlineMap,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [parentReplyMessage, setParentReplyMessage] = useState<ChatMessage | null>(null);

  // Attached images before sending
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length >= 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (!selectedChannel) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-secondary)',
          padding: '24px',
          textAlign: 'center',
          gap: '8px',
        }}
      >
        <h3 style={{ fontSize: '16px', color: 'var(--text-primary)' }}>Chưa chọn cuộc hội thoại</h3>
        <p style={{ fontSize: '13px' }}>
          Chọn một cuộc trò chuyện ở cột bên trái hoặc tạo cuộc trò chuyện mới để bắt đầu.
        </p>
      </div>
    );
  }

  const isDirect = selectedChannel.type === 'DIRECT';
  const isRecipientOnline = Boolean(onlineMap[selectedChannel.creatorId]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    sendTyping(e.target.value.trim().length > 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendSubmit();
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Chỉ chấp nhận tệp hình ảnh (PNG, JPEG, WEBP, GIF)', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Kích thước ảnh tối đa 10MB', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      const res = await CommunityApi.uploadMediaFile(file);
      setPendingAttachments((prev) => [
        ...prev,
        {
          type: 'IMAGE',
          url: res.publicUrl,
          title: file.name,
        },
      ]);
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Tải ảnh thất bại'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content && pendingAttachments.length === 0) return;

    setSubmitting(true);
    sendTyping(false);

    try {
      await sendMessage(content, {
        parentMessageId: parentReplyMessage?.id,
        attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      });
      setInputText('');
      setPendingAttachments([]);
      setParentReplyMessage(null);
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể gửi tin nhắn'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const channelTitle = selectedChannel.name || `Hội thoại #${selectedChannel.id.slice(0, 6)}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-canvas)',
      }}
    >
      {/* Conversation Top Header */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-badge)',
                color: 'var(--color-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {isDirect ? 'D' : 'G'}
            </span>
            {isDirect && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: isRecipientOnline ? 'var(--color-success)' : 'var(--text-muted)',
                  border: '2px solid var(--bg-surface)',
                }}
              />
            )}
          </div>

          <div>
            <h3
              style={{
                fontSize: '14.5px',
                fontWeight: 700,
                margin: 0,
                color: 'var(--text-primary)',
              }}
            >
              {channelTitle}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isDirect
                ? isRecipientOnline
                  ? 'Đang hoạt động'
                  : 'Ngoại tuyến'
                : `${selectedChannel.membersCount} thành viên`}
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Đóng cuộc trò chuyện"
            style={{ padding: '6px' }}
          >
            <CloseIcon size={16} />
          </button>
        )}
      </div>

      {/* Message List Scroll Area */}
      <div
        ref={scrollRef}
        data-testid="chat-messages-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {nextCursor && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              disabled={loadingMessages}
              onClick={() => void loadMoreMessages()}
              className="btn-ghost"
              style={{ fontSize: '11.5px', padding: '4px 10px' }}
            >
              {loadingMessages ? 'Đang tải...' : 'Tải thêm tin nhắn cũ'}
            </button>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderId === user?.id;

          return (
            <div
              key={msg.id}
              data-testid={`chat-message-${msg.id}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
                gap: '3px',
              }}
            >
              {!isMine && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  u/{msg.senderUsername}
                </span>
              )}

              <div
                style={{
                  maxWidth: '72%',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  borderBottomRightRadius: isMine ? '4px' : '14px',
                  borderBottomLeftRadius: !isMine ? '4px' : '14px',
                  backgroundColor: isMine ? 'var(--color-brand)' : 'var(--bg-surface)',
                  color: isMine ? 'var(--text-inverse)' : 'var(--text-primary)',
                  border: isMine ? '1px solid transparent' : '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.parentMessageId && (
                  <div
                    style={{
                      padding: '4px 8px',
                      marginBottom: '6px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isMine ? 'rgba(0,0,0,0.08)' : 'var(--bg-subtle)',
                      fontSize: '11.5px',
                      fontStyle: 'italic',
                    }}
                  >
                    ↳ Phản hồi tin nhắn trước
                  </div>
                )}

                {msg.content}

                {/* Render Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {msg.attachments.map((att) => {
                      if (att.type === 'IMAGE' && att.url) {
                        return (
                          <img
                            key={att.url}
                            data-testid="chat-message-image"
                            src={resolveRenderableMediaUrl(att.url)}
                            alt={att.title || 'Ảnh đính kèm'}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '260px',
                              borderRadius: 'var(--radius-md)',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>

              {/* Bottom metadata & reply action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '10.5px',
                  color: 'var(--text-muted)',
                }}
              >
                <span>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span>•</span>
                <button
                  type="button"
                  data-testid="chat-reply-btn"
                  onClick={() => setParentReplyMessage(msg)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--text-secondary)',
                    fontSize: '10.5px',
                    cursor: 'pointer',
                  }}
                >
                  Trả lời
                </button>
                {msg.repliesCount > 0 && (
                  <span
                    data-testid="chat-replies-count"
                    style={{ color: 'var(--color-brand)', fontWeight: 600 }}
                  >
                    ({msg.repliesCount} phản hồi)
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Realtime Typing Indicator */}
        {typingUsers.length > 0 && (
          <div
            data-testid="chat-typing-indicator"
            style={{
              fontSize: '11.5px',
              fontStyle: 'italic',
              color: 'var(--color-brand)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>u/{typingUsers.join(', ')} đang soạn tin nhắn...</span>
          </div>
        )}
      </div>

      {/* Reply Banner */}
      {parentReplyMessage && (
        <div
          data-testid="chat-reply-banner"
          style={{
            padding: '6px 14px',
            backgroundColor: 'var(--bg-subtle)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <span>
            Đang trả lời <strong>u/{parentReplyMessage.senderUsername}</strong>: &ldquo;
            {parentReplyMessage.content.slice(0, 40)}&rdquo;
          </span>
          <button
            type="button"
            onClick={() => setParentReplyMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            × Hủy
          </button>
        </div>
      )}

      {/* Pending Attachment Previews */}
      {pendingAttachments.length > 0 && (
        <div
          style={{
            padding: '8px 14px',
            backgroundColor: 'var(--bg-subtle)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          {pendingAttachments.map((att) => (
            <div
              key={att.url}
              style={{
                position: 'relative',
                width: '60px',
                height: '60px',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <img
                src={att.url ? resolveRenderableMediaUrl(att.url) : ''}
                alt="Xem trước"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() =>
                  setPendingAttachments((prev) => prev.filter((p) => p.url !== att.url))
                }
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Composer */}
      <form
        onSubmit={handleSendSubmit}
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <label
          style={{
            cursor: 'pointer',
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            color: uploadingImage ? 'var(--color-brand)' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Đính kèm ảnh"
        >
          <ImageIcon size={18} />
          <input
            data-testid="chat-image-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploadingImage}
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </label>

        <textarea
          data-testid="chat-message-input"
          required={pendingAttachments.length === 0}
          rows={1}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn (Enter gửi, Shift+Enter xuống dòng)..."
          className="input-field"
          style={{
            flex: 1,
            resize: 'none',
            minHeight: '38px',
            maxHeight: '110px',
            padding: '9px 14px',
            borderRadius: '12px',
            fontSize: '13.5px',
            lineHeight: 1.4,
          }}
        />

        <button
          type="submit"
          data-testid="chat-send-btn"
          disabled={
            submitting || uploadingImage || (!inputText.trim() && pendingAttachments.length === 0)
          }
          className="btn-primary"
          style={{ padding: '9px 18px', fontSize: '13px', flexShrink: 0 }}
        >
          {submitting ? '...' : 'Gửi'}
        </button>
      </form>
    </div>
  );
}
