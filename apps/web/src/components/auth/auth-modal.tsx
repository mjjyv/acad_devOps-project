'use client';

import { HttpError } from '@acad/auth-client';
import { type FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { CloseIcon } from '../ui/icons';

function formatApiError(err: unknown): string {
  if (err instanceof HttpError) {
    const invalidParams = err.rfc7807?.invalidParams;
    if (Array.isArray(invalidParams) && invalidParams.length > 0) {
      const first = invalidParams[0] as { message?: string };
      if (first?.message) return first.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại';
}

export function AuthModal() {
  const { isAuthModalOpen, authModalMode, authModalTitle, closeAuthModal, login, register } =
    useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(authModalMode);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    setMode(authModalMode);
    setErrorMsg(null);
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (mode === 'login') {
        await login({ identifier, password });
      } else {
        await register({ username, email, password });
      }
      setPassword('');
    } catch (err) {
      setErrorMsg(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
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
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div
        className="surface-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          boxShadow: 'var(--shadow-floating)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {authModalTitle || (mode === 'login' ? 'Đăng nhập SYNAPSE' : 'Tạo tài khoản mới')}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {mode === 'login'
                ? 'Xác thực Scrypt & Phiên bảo mật 2 tầng'
                : 'Trải nghiệm diễn đàn kiến trúc & DevOps thực thụ'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Đóng hộp thoại"
            className="btn-ghost"
            style={{ padding: '6px' }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={mode === 'login' ? 'btn-primary' : 'btn-ghost'}
            style={{ flex: 1 }}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={mode === 'register' ? 'btn-primary' : 'btn-ghost'}
            style={{ flex: 1 }}
          >
            Đăng ký
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-danger)',
              backgroundColor: 'rgba(248, 113, 113, 0.12)',
              color: 'var(--color-danger)',
              fontSize: '13px',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          {mode === 'login' ? (
            <label
              style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}
            >
              <span>Username hoặc Email</span>
              <input
                className="input-field"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin_pro"
                required
              />
            </label>
          ) : (
            <>
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}
              >
                <span>Username</span>
                <input
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="devops_engineer"
                  required
                />
              </label>
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}
              >
                <span>Email</span>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@acad.vn"
                  required
                />
              </label>
            </>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
            <span>Mật khẩu</span>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự (Hoa, thường, số)"
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ marginTop: '4px' }}
          >
            {submitting
              ? 'Đang xử lý...'
              : mode === 'login'
                ? 'Đăng nhập ngay'
                : 'Hoàn tất đăng ký'}
          </button>
        </form>
      </div>
    </div>
  );
}
