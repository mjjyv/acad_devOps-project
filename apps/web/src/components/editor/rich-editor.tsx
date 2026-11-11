'use client';

import type { Space, SpaceFlair } from '@acad/contracts';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, type DragEvent, useEffect, useState } from 'react';
import { CommunityApi } from '@/lib/api/community';

interface RichEditorProps {
  spaces: Space[];
  initialSpaceSlug?: string;
  flairs?: SpaceFlair[];
}

export function RichEditor({ spaces, initialSpaceSlug, flairs = [] }: RichEditorProps) {
  const router = useRouter();

  const [selectedSpaceSlug, setSelectedSpaceSlug] = useState(
    initialSpaceSlug || (spaces[0]?.slug ?? ''),
  );
  const [spaceFlairs, setSpaceFlairs] = useState<SpaceFlair[]>(flairs);
  const [activeTypeTab, setActiveTypeTab] = useState<'text' | 'media' | 'link'>('text');
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFlairId, setSelectedFlairId] = useState<string | undefined>();
  const [mediaFile, setMediaFile] = useState<{
    name: string;
    size: number;
    publicUrl: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSpaceSlug) return;
    let isMounted = true;
    CommunityApi.getSpace(selectedSpaceSlug)
      .then((data) => {
        if (!isMounted) return;
        setSpaceFlairs(data.flairs);
        setSelectedFlairId((prev) => (data.flairs.some((f) => f.id === prev) ? prev : undefined));
      })
      .catch(() => {
        if (isMounted) setSpaceFlairs([]);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedSpaceSlug]);

  // Thêm cú pháp định dạng nhanh vào textarea
  const insertFormatting = (prefix: string, suffix = '') => {
    const textarea = document.getElementById('rich-editor-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'văn bản'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText.length || 7),
      );
    }, 0);
  };

  // Xác minh Magic Bytes hình ảnh phía client
  const handleFileSelection = async (file: File) => {
    setErrorMessage(null);
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Kích thước ảnh vượt quá giới hạn tối đa 5MB.');
      return;
    }

    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Kiểm tra Magic Bytes
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isGif = bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
    const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;

    if (!isJpeg && !isPng && !isGif && !isWebp) {
      setErrorMessage(
        'Tệp không hợp lệ! Chỉ chấp nhận ảnh JPEG, PNG, WEBP, GIF thật (Magic Bytes hợp lệ).',
      );
      return;
    }

    try {
      const presigned = await CommunityApi.getPresignedUploadUrl(
        file.name,
        file.type || 'image/png',
      );
      const isDirectStorageConfigured = !presigned.uploadUrl.includes('s3.amazonaws.com');
      if (!isDirectStorageConfigured) {
        setErrorMessage(
          'Zero-Hop Object Storage (R2/S3) chưa cấu hình trong .env; vui lòng dùng URL ảnh HTTPS công khai trong nội dung Markdown.',
        );
        return;
      }

      const uploadRes = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/png' },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload failed (${uploadRes.status})`);
      }

      setMediaFile({ name: file.name, size: file.size, publicUrl: presigned.publicUrl });
      setContent((prev) => `${prev}\n\n![${file.name}](${presigned.publicUrl})`.trim());
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể tải ảnh lên Object Storage.');
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!selectedSpaceSlug) {
      setErrorMessage('Vui lòng chọn một Không gian thảo luận.');
      return;
    }
    if (title.trim().length < 5) {
      setErrorMessage('Tiêu đề bài viết phải có tối thiểu 5 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const thread = await CommunityApi.createThread(selectedSpaceSlug, {
        title: title.trim(),
        contentText: content.trim() || undefined,
        linkUrl: activeTypeTab === 'link' ? linkUrl.trim() : undefined,
        flairId: selectedFlairId,
      });

      router.push(`/threads/${thread.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi tạo bài';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        padding: '24px',
      }}
    >
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          margin: '0 0 20px 0',
        }}
      >
        Tạo Bài Viết Mới
      </h2>

      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#f43f5e',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* 1. Bộ chọn Không Gian */}
      <div style={{ marginBottom: '18px' }}>
        <label
          htmlFor="space-select-dropdown"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
            marginBottom: '8px',
          }}
        >
          Chọn Không Gian Thảo Luận
        </label>
        <select
          id="space-select-dropdown"
          value={selectedSpaceSlug}
          onChange={(e) => setSelectedSpaceSlug(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '360px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
          }}
        >
          {spaces.map((s) => (
            <option key={s.id} value={s.slug}>
              s/{s.slug} ({s.name})
            </option>
          ))}
        </select>
      </div>

      {/* 2. Cụm 3 Tabs: Post | Media | Link */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTypeTab('text')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            fontSize: '13px',
            fontWeight: activeTypeTab === 'text' ? 700 : 500,
            color: activeTypeTab === 'text' ? 'var(--color-brand)' : 'var(--text-secondary)',
            borderBottom: activeTypeTab === 'text' ? '2px solid var(--color-brand)' : 'none',
            cursor: 'pointer',
          }}
        >
          📝 Bài Viết & Mã Nguồn
        </button>
        <button
          type="button"
          onClick={() => setActiveTypeTab('media')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            fontSize: '13px',
            fontWeight: activeTypeTab === 'media' ? 700 : 500,
            color: activeTypeTab === 'media' ? 'var(--color-brand)' : 'var(--text-secondary)',
            borderBottom: activeTypeTab === 'media' ? '2px solid var(--color-brand)' : 'none',
            cursor: 'pointer',
          }}
        >
          🖼️ Hình Ảnh & Tệp Đính Kèm
        </button>
        <button
          type="button"
          onClick={() => setActiveTypeTab('link')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            fontSize: '13px',
            fontWeight: activeTypeTab === 'link' ? 700 : 500,
            color: activeTypeTab === 'link' ? 'var(--color-brand)' : 'var(--text-secondary)',
            borderBottom: activeTypeTab === 'link' ? '2px solid var(--color-brand)' : 'none',
            cursor: 'pointer',
          }}
        >
          🔗 Liên Kết Ngoài
        </button>
      </div>

      {/* 3. Ô Nhập Tiêu Đề */}
      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <input
          type="text"
          placeholder="Tiêu đề bài thảo luận (tối thiểu 5 ký tự)..."
          value={title}
          maxLength={300}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 60px 12px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
            fontSize: '15px',
            fontWeight: 600,
            outline: 'none',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '11px',
            color: title.length >= 280 ? '#f43f5e' : 'var(--text-muted)',
            fontFamily: 'monospace',
          }}
        >
          {title.length}/300
        </span>
      </div>

      {/* 4. Chọn Post Flair nếu có */}
      {spaceFlairs.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Nhãn bài viết (Post Flair):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {spaceFlairs.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFlairId(selectedFlairId === f.id ? undefined : f.id)}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor:
                    selectedFlairId === f.id
                      ? f.colorHex || 'var(--color-brand)'
                      : 'var(--bg-subtle)',
                  color: selectedFlairId === f.id ? '#090a0f' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Giao diện theo Tab */}
      {activeTypeTab === 'link' ? (
        <div style={{ marginBottom: '20px' }}>
          <input
            type="url"
            placeholder="https://example.com/kien-truc-he-thong..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      ) : (
        <>
          {activeTypeTab === 'media' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: '2px dashed var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: 'rgba(6, 182, 212, 0.04)',
                marginBottom: '16px',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('media-upload-input')?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  document.getElementById('media-upload-input')?.click();
                }
              }}
            >
              <input
                id="media-upload-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  if (e.target.files?.[0]) {
                    handleFileSelection(e.target.files[0]);
                  }
                }}
              />
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📁</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Kéo thả ảnh hoặc nhấp để chọn tệp
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Hỗ trợ PNG, JPEG, WEBP, GIF (Tối đa 5MB • Kiểm tra Magic Bytes)
              </div>
              {mediaFile && (
                <div style={{ marginTop: '12px', color: 'var(--color-brand)', fontSize: '13px' }}>
                  ✓ Đã tải: {mediaFile.name} ({(mediaFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          )}

          {/* Thanh công cụ Định dạng Markdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderBottom: 'none',
              borderTopLeftRadius: 'var(--radius-md)',
              borderTopRightRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                title="Đậm (Ctrl+B)"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                title="Nghiêng (Ctrl+I)"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontStyle: 'italic',
                  cursor: 'pointer',
                }}
              >
                I
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('`', '`')}
                title="Mã nội dòng (Inline Code)"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-brand)',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                &lt;/&gt;
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('```ts\n', '\n```')}
                title="Khối mã nguồn (Code Block)"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-brand)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Code Block
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('> ')}
                title="Trích dẫn (Quote)"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                &quot;
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('- ')}
                title="Danh sách (Bullet List)"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                • List
              </button>
            </div>

            {/* Toggle Chỉnh sửa / Xem trước */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setEditorMode('write')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: editorMode === 'write' ? 700 : 500,
                  backgroundColor: editorMode === 'write' ? 'var(--bg-surface)' : 'transparent',
                  color: editorMode === 'write' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Soạn thảo
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('preview')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: editorMode === 'preview' ? 700 : 500,
                  backgroundColor: editorMode === 'preview' ? 'var(--bg-surface)' : 'transparent',
                  color: editorMode === 'preview' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Xem trước
              </button>
            </div>
          </div>

          {/* Vùng Nhập / Xem Trước */}
          {editorMode === 'write' ? (
            <textarea
              id="rich-editor-textarea"
              placeholder="Chia sẻ kiến trúc hệ thống, cấu hình DevOps hoặc thảo luận kỹ thuật (Hỗ trợ Markdown & Code Block)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              style={{
                width: '100%',
                padding: '14px',
                border: '1px solid var(--border-subtle)',
                borderBottomLeftRadius: 'var(--radius-md)',
                borderBottomRightRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
                marginBottom: '20px',
              }}
            />
          ) : (
            <div
              style={{
                minHeight: '260px',
                padding: '14px',
                border: '1px solid var(--border-subtle)',
                borderBottomLeftRadius: 'var(--radius-md)',
                borderBottomRightRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                lineHeight: 1.6,
                marginBottom: '20px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {content ? (
                <div>{content}</div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Chưa có nội dung để xem trước...
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 6. Footer Hành Động */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            padding: '10px 20px',
            borderRadius: '9999px',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            padding: '10px 24px',
            borderRadius: '9999px',
            border: 'none',
            backgroundColor: isSubmitting ? 'var(--border-strong)' : 'var(--color-brand)',
            color: '#090a0f',
            fontSize: '13px',
            fontWeight: 800,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {isSubmitting ? 'Đang gửi bài...' : 'Đăng Bài Viết'}
        </button>
      </div>
    </div>
  );
}
