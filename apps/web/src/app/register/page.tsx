'use client';

import { HttpError } from '@acad/auth-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
import { RedditAlienLogo } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

export default function RegisterPage() {
  const router = useRouter();
  const { user, register } = useAuth();
  const { showToast } = useUI();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
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
      if (!username.trim() || username.trim().length < 3) {
        throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự');
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
      showToast('Đăng ký tài khoản thành công!');
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        setError(err.message || 'Không thể đăng ký tài khoản');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Đã xảy ra lỗi đăng ký');
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
          maxWidth: '420px',
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
            Tạo Tài Khoản Acad Platform
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Tham gia cộng đồng kỹ sư DevOps & Distributed Systems
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
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <label
              htmlFor="reg-username"
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
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-32 ký tự, không dấu (ví dụ: devops_vn)"
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
              htmlFor="reg-email"
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
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
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
              htmlFor="reg-password"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Mật khẩu (tối thiểu 8 ký tự, gồm chữ hoa, thường & số)
            </label>
            <input
              id="reg-password"
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
            {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng Ký Tài Khoản'}
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
          Đã có tài khoản?{' '}
          <Link
            href="/login"
            style={{ color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'none' }}
          >
            Đăng nhập ngay
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
