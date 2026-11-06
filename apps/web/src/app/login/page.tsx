'use client';

import { HttpError } from '@acad/auth-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import { RedditAlienLogo } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const { showToast } = useUI();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!identifier.trim()) throw new Error('Vui lòng nhập Username hoặc Email');
      if (!password) throw new Error('Vui lòng nhập mật khẩu');

      await login({ identifier: identifier.trim(), password });
      showToast('Đăng nhập thành công!');
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        setError(err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Đã xảy ra lỗi đăng nhập');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-canvas)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="reddit-card"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '32px 28px',
          boxShadow: 'var(--shadow-floating)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <RedditAlienLogo size={48} />
          </div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '4px',
            }}
          >
            Đăng Nhập Acad Platform
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Tiếp tục thảo luận và chia sẻ kiến thức DevOps
          </p>
        </div>

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

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div>
            <label
              htmlFor="login-identifier"
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
              id="login-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Nhập tên đăng nhập hoặc email..."
              required
              style={{
                width: '100%',
                height: '42px',
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
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Mật khẩu
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                height: '42px',
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
              height: '44px',
              fontSize: '14px',
              fontWeight: 700,
              width: '100%',
              marginTop: '6px',
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>

        <div
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          Chưa có tài khoản?{' '}
          <Link
            href="/register"
            style={{ color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'none' }}
          >
            Tạo tài khoản mới
          </Link>
        </div>

        <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
