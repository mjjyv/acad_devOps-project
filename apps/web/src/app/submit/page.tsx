'use client';

import type { Space, SpaceFlair, ThreadType } from '@acad/contracts';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ChangeEvent, type FormEvent, Suspense, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { CloseIcon, ImageIcon } from '@/components/ui/icons';
import { extractApiErrorMessage } from '@/lib/api/client';
import { CommunityApi, resolveRenderableMediaUrl } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface UploadedMediaItem {
  key: string;
  publicUrl: string;
  fileName: string;
}

function SubmitComposerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSpaceSlug = searchParams.get('space') ?? '';

  const { isAuthenticated, isLoading: authLoading, openAuthModal } = useAuth();
  const { showToast } = useUI();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSlug, setSelectedSlug] = useState(initialSpaceSlug);
  const [flairs, setFlairs] = useState<SpaceFlair[]>([]);
  const [flairId, setFlairId] = useState('');

  const [threadType, setThreadType] = useState<ThreadType>('TEXT');
  const [title, setTitle] = useState('');
  const [contentText, setContentText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMediaItem[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadSpaces() {
      try {
        const list = await CommunityApi.getSpaces(50, 0);
        if (!active) return;
        setSpaces(list);
        if (initialSpaceSlug && list.some((s) => s.slug === initialSpaceSlug)) {
          setSelectedSlug(initialSpaceSlug);
        } else if (!selectedSlug && list.length > 0 && list[0]) {
          setSelectedSlug(list[0].slug);
        }
      } catch {
        // leave spaces empty
      }
    }
    void loadSpaces();
    return () => {
      active = false;
    };
  }, [initialSpaceSlug, selectedSlug]);

  useEffect(() => {
    if (!selectedSlug) {
      setFlairs([]);
      setFlairId('');
      return;
    }
    let active = true;
    async function loadFlairs() {
      try {
        const list = await CommunityApi.getFlairs(selectedSlug);
        if (active) {
          setFlairs(list);
          setFlairId('');
        }
      } catch {
        if (active) setFlairs([]);
      }
    }
    void loadFlairs();
    return () => {
      active = false;
    };
  }, [selectedSlug]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    e.target.value = '';

    if (uploadedMedia.length + files.length > 10) {
      setErrorMsg('Mỗi bài viết tối đa 10 hình ảnh.');
      return;
    }

    setErrorMsg(null);
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setErrorMsg(
          `Định dạng "${file.type || file.name}" chưa hỗ trợ. Chỉ nhận PNG, JPEG, WEBP, GIF.`,
        );
        continue;
      }
      if (file.size <= 0 || file.size > MAX_IMAGE_SIZE_BYTES) {
        setErrorMsg(`Tệp "${file.name}" vượt quá giới hạn 10MB.`);
        continue;
      }

      try {
        setUploadingCount((c) => c + 1);
        const presign = await CommunityApi.uploadMediaFile(file);
        setUploadedMedia((prev) => [
          ...prev,
          { key: presign.key, publicUrl: presign.publicUrl, fileName: file.name },
        ]);
      } catch (err) {
        setErrorMsg(extractApiErrorMessage(err, `Tải lên tệp "${file.name}" thất bại`));
      } finally {
        setUploadingCount((c) => Math.max(0, c - 1));
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSlug) {
      setErrorMsg('Vui lòng chọn không gian đăng bài.');
      return;
    }
    if (threadType === 'MEDIA' && uploadedMedia.length === 0) {
      setErrorMsg('Vui lòng tải lên ít nhất 1 hình ảnh cho bài viết MEDIA.');
      return;
    }
    if (threadType === 'LINK' && !linkUrl.trim()) {
      setErrorMsg('Vui lòng nhập đường dẫn URL hợp lệ.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await CommunityApi.createThread(selectedSlug, {
        title: title.trim(),
        threadType,
        ...(flairId ? { flairId } : {}),
        ...(contentText.trim() ? { contentText: contentText.trim() } : {}),
        ...(threadType === 'LINK' && linkUrl.trim() ? { linkUrl: linkUrl.trim() } : {}),
        ...(threadType === 'MEDIA' && uploadedMedia.length > 0
          ? { mediaUrls: uploadedMedia.map((m) => m.publicUrl) }
          : {}),
      });
      showToast('Đăng bài viết thành công', 'success');
      router.push(`/threads/${created.id}`);
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'Không thể đăng bài viết'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <section className="surface-card" style={{ padding: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Tạo bài viết mới
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Hỗ trợ bài viết văn bản, chia sẻ liên kết hoặc tải ảnh nhị phân thật lên Storage.
          </p>
        </section>

        {!authLoading && !isAuthenticated ? (
          <section
            className="surface-card"
            style={{
              padding: '28px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Bạn cần đăng nhập để đăng bài viết mới vào không gian thảo luận.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-primary" onClick={() => openAuthModal('login')}>
                Đăng nhập ngay
              </button>
              <Link href="/login" className="btn-ghost" style={{ textDecoration: 'none' }}>
                Tới trang đăng nhập
              </Link>
            </div>
          </section>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="surface-card"
            style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            {/* Space & Flair selectors */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
              }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span
                  style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}
                >
                  Không gian đăng bài (Space)
                </span>
                <select
                  name="spaceSlug"
                  required
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="input-field"
                >
                  <option value="" disabled>
                    -- Chọn Space --
                  </option>
                  {spaces.map((s) => (
                    <option key={s.id} value={s.slug}>
                      s/{s.slug} — {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span
                  style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}
                >
                  Nhãn bài viết (Flair - tùy chọn)
                </span>
                <select
                  name="flairId"
                  value={flairId}
                  onChange={(e) => setFlairId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Không gắn Flair</option>
                  {flairs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Post type switcher */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['TEXT', 'LINK', 'MEDIA'] as const).map((typeOption) => {
                const active = threadType === typeOption;
                return (
                  <button
                    key={typeOption}
                    type="button"
                    onClick={() => setThreadType(typeOption)}
                    className={active ? 'btn-primary' : 'btn-ghost'}
                    style={{ padding: '6px 14px', fontSize: '13px' }}
                  >
                    {typeOption === 'TEXT'
                      ? 'Văn bản (TEXT)'
                      : typeOption === 'LINK'
                        ? 'Liên kết (LINK)'
                        : 'Hình ảnh (MEDIA)'}
                  </button>
                );
              })}
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Tiêu đề bài viết (tối thiểu 5 ký tự)
              </span>
              <input
                name="title"
                type="text"
                required
                minLength={5}
                maxLength={300}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề súc tích, rõ ngữ cảnh..."
                className="input-field"
              />
            </label>

            {threadType === 'LINK' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span
                  style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}
                >
                  Đường dẫn tham chiếu (URL)
                </span>
                <input
                  name="linkUrl"
                  type="url"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.org/architecture-rfc"
                  className="input-field"
                />
              </label>
            )}

            {threadType === 'MEDIA' && (
              <div
                style={{
                  border: '1px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  backgroundColor: 'var(--bg-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ImageIcon size={18} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        Tải ảnh thật lên hệ thống lưu trữ ({uploadedMedia.length}/10)
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Chấp nhận PNG, JPEG, WEBP, GIF tối đa 10MB/tệp.
                      </div>
                    </div>
                  </div>

                  <label
                    className="btn-ghost"
                    style={{
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{uploadingCount > 0 ? 'Đang tải ảnh lên...' : 'Chọn tệp hình ảnh'}</span>
                    <input
                      data-testid="media-file-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      multiple
                      disabled={uploadingCount > 0}
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {uploadedMedia.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {uploadedMedia.map((item) => (
                      <div
                        key={item.key}
                        data-testid="uploaded-media-preview"
                        style={{
                          position: 'relative',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-surface)',
                        }}
                      >
                        <img
                          src={resolveRenderableMediaUrl(item.publicUrl)}
                          alt={item.fileName}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        <button
                          type="button"
                          aria-label={`Gỡ ảnh ${item.fileName}`}
                          onClick={() =>
                            setUploadedMedia((prev) => prev.filter((m) => m.key !== item.key))
                          }
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            backgroundColor: 'rgba(14, 17, 28, 0.85)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <CloseIcon size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Nội dung chi tiết {threadType === 'TEXT' ? '' : '(tùy chọn)'}
              </span>
              <textarea
                name="contentText"
                rows={6}
                maxLength={40000}
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="Trình bày chi tiết vấn đề, cấu hình hoặc ghi chú kỹ thuật..."
                className="input-field"
                style={{ resize: 'vertical' }}
              />
            </label>

            {errorMsg && (
              <div
                role="alert"
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-danger)',
                  color: 'var(--color-danger)',
                  fontSize: '13px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Link
                href={selectedSlug ? `/s/${selectedSlug}` : '/'}
                className="btn-ghost"
                style={{ textDecoration: 'none' }}
              >
                Hủy
              </Link>
              <button
                type="submit"
                disabled={submitting || uploadingCount > 0}
                className="btn-primary"
              >
                {submitting ? 'Đang xuất bản...' : 'Đăng bài viết'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

export default function SubmitPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="surface-card" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Đang khởi tạo trình soạn thảo...
          </div>
        </AppShell>
      }
    >
      <SubmitComposerContent />
    </Suspense>
  );
}
