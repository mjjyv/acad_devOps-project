'use client';

import type { Space } from '@acad/contracts';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import { CommunityApi } from '@/lib/api/community';
import { useUI } from '@/lib/store/ui-context';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (space: Space) => void;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function CreateSpaceModal({ isOpen, onClose, onCreated }: CreateSpaceModalProps) {
  const router = useRouter();
  const { showToast } = useUI();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) {
      setSlug(toSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normalizedSlug = slug.trim().toLowerCase();
    if (name.trim().length < 2) {
      setErrorMsg('Tên không gian phải có ít nhất 2 ký tự.');
      return;
    }
    if (!/^[a-z0-9_-]{3,64}$/.test(normalizedSlug)) {
      setErrorMsg('Slug chỉ gồm 3-64 ký tự chữ thường, số, gạch nối (-) hoặc gạch dưới (_).');
      return;
    }

    try {
      setSubmitting(true);
      const created = await CommunityApi.createSpace({
        name: name.trim(),
        slug: normalizedSlug,
        description: description.trim() || undefined,
        isPrivate,
      });
      showToast(`Đã tạo không gian s/${created.slug}`);
      onCreated?.(created);
      setName('');
      setSlug('');
      setSlugEdited(false);
      setDescription('');
      setIsPrivate(false);
      onClose();
      router.push(`/s/${created.slug}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tạo không gian thảo luận');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 12, 20, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 120,
      }}
      onClick={onClose}
    >
      <div
        className="reddit-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '24px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Tạo Không Gian Thảo Luận Mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
            aria-label="Đóng"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(244, 63, 94, 0.14)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#f43f5e',
              fontSize: '12px',
              marginBottom: '14px',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <label
              htmlFor="create-space-name"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Tên cộng đồng
            </label>
            <input
              id="create-space-name"
              type="text"
              required
              maxLength={128}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="VD: Distributed Systems"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="create-space-slug"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Đường dẫn (s/...)
            </label>
            <input
              id="create-space-slug"
              type="text"
              required
              maxLength={64}
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
              placeholder="distributed-systems"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="create-space-desc"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Mô tả ngắn
            </label>
            <textarea
              id="create-space-desc"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chủ đề thảo luận chính của cộng đồng..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                resize: 'vertical',
              }}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <span>Không gian riêng tư (chỉ thành viên được phê duyệt mới truy cập được)</span>
          </label>

          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}
          >
            <button type="button" className="reddit-pill-btn" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="reddit-pill-btn primary">
              {submitting ? 'Đang khởi tạo...' : 'Tạo Không Gian'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
