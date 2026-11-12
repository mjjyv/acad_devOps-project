'use client';

import type { Space } from '@acad/contracts';
import { type FormEvent, useState } from 'react';
import { CommunityApi } from '@/lib/api/community';
import { useUI } from '@/lib/store/ui-context';
import { CloseIcon } from '../ui/icons';

interface CreateSpaceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (space: Space) => void;
}

export function CreateSpaceModal({ open, onClose, onCreated }: CreateSpaceModalProps) {
  const { showToast } = useUI();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [topic, setTopic] = useState('DevOps & SRE');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await CommunityApi.createSpace({
        name,
        slug: slug.toLowerCase(),
        topic,
        description: description || undefined,
        isPrivate,
      });
      showToast(`Đã tạo không gian s/${created.slug}`, 'success');
      onCreated(created);
      onClose();
      setName('');
      setSlug('');
      setDescription('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tạo không gian');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tạo không gian thảo luận mới"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(14, 17, 28, 0.72)',
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
          maxWidth: '460px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Tạo Space mới</h3>
          <button type="button" onClick={onClose} className="btn-ghost" style={{ padding: '6px' }}>
            <CloseIcon size={16} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ color: 'var(--color-danger)', fontSize: '13px' }}>{errorMsg}</div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
            <span>Tên không gian</span>
            <input
              className="input-field"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) {
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, ''),
                  );
                }
              }}
              placeholder="Kubernetes Architecture"
              required
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
            <span>Đường dẫn (slug)</span>
            <input
              className="input-field"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="k8s-arch"
              required
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
            <span>Chủ đề</span>
            <input
              className="input-field"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="DevOps & SRE"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
            <span>Mô tả</span>
            <textarea
              className="input-field"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả mục đích thảo luận của không gian..."
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <span>Không gian riêng tư (Private Space)</span>
          </label>

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Đang tạo...' : 'Tạo không gian'}
          </button>
        </form>
      </div>
    </div>
  );
}
