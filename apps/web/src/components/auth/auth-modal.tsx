'use client';

import { HttpError } from '@acad/auth-client';
import type React from 'react';
import { useEffect, useState } from 'react';
import { CloseIcon, SynapseLogo } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

export function AuthModal() {
  const { isAuthModalOpen, authModalMode, authModalTitle, closeAuthModal, login, register } =
    useAuth();
  const { showToast } = useUI();

  const [mode, setMode] = useState<'login' | 'register'>(authModalMode);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync mode with context
  useEffect(() => {
    setMode(authModalMode);
    setError(null);
  }, [authModalMode]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (!identifier.trim()) {
          throw new Error('Vui lòng nhập Username hoặc Email');
        }
        if (!password) {
          throw new Error('Vui lòng nhập mật khẩu');
        }
        await login({ identifier: identifier.trim(), password });
        showToast('Đăng nhập thành công!');
      } else {
        if (!username.trim() || username.trim().length < 3) {
          throw new Error('Tên đăng nhập phải có tối thiểu 3 ký tự');
        }
        if (!email.trim() || !email.includes('@')) {
          throw new Error('Địa chỉ email không hợp lệ');
        }
        if (password.length < 8) {
          throw new Error('Mật khẩu phải có tối thiểu 8 ký tự');
        }
        await register({
          username: username.trim(),
          email: email.trim(),
          password,
        });
        showToast(`Chào mừng @${username.trim()} đến với Acad Platform!`);
      }
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        setError(err.message || 'Yêu cầu xác thực thất bại');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Đã xảy ra lỗi không xác định');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(14, 17, 19, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={closeAuthModal}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          boxShadow: 'var(--shadow-floating)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'color 0.15s ease',
          }}
          aria-label="Đóng"
        >
          <CloseIcon size={20} />
        </button>

        {/* Modal Branding Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <SynapseLogo size={36} />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {authModalTitle || (mode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản')}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Synapse Platform • The Neural Network for Engineers
            </p>
          </div>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              marginBottom: '16px',
              color: 'var(--color-danger)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Mode Switch Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-pill)',
            borderRadius: 'var(--radius-full)',
            padding: '3px',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            style={{
              flex: 1,
              border: 'none',
              padding: '8px 0',
              borderRadius: 'var(--radius-full)',
              background: mode === 'login' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            style={{
              flex: 1,
              border: 'none',
              padding: '8px 0',
              borderRadius: 'var(--radius-full)',
              background: mode === 'register' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'register' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: mode === 'register' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Auth Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          {mode === 'login' ? (
            <div>
              <label
                htmlFor="auth-identifier"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Username hoặc Email
              </label>
              <input
                id="auth-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc email..."
                required
                style={{
                  width: '100%',
                  height: '40px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0 12px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="auth-username"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  Tên đăng nhập (Username)
                </label>
                <input
                  id="auth-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: devops_master (3-32 ký tự)"
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0 12px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="auth-email"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                  }}
                >
                  Địa chỉ Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0 12px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="auth-password"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Mật khẩu {mode === 'register' && '(tối thiểu 8 ký tự, chữ hoa, thường & số)'}
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                height: '40px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0 12px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="reddit-pill-btn primary"
            style={{
              height: '42px',
              fontSize: '14px',
              fontWeight: 700,
              width: '100%',
              marginTop: '8px',
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? (
              <span>Đang xử lý...</span>
            ) : mode === 'login' ? (
              <span>Đăng Nhập</span>
            ) : (
              <span>Tạo Tài Khoản & Tiếp Tục</span>
            )}
          </button>
        </form>

        {/* Mode toggle prompt */}
        <div
          style={{
            marginTop: '18px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          {mode === 'login' ? (
            <>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-brand)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Đăng ký ngay
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-brand)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Đăng nhập
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
