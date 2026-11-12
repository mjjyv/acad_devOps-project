'use client';

import { HttpError } from '@acad/auth-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/lib/auth/auth-context';

function extractAuthError(err: unknown): string {
  if (err instanceof HttpError) {
    const invalidParams = err.rfc7807?.invalidParams;
    if (Array.isArray(invalidParams) && invalidParams.length > 0) {
      const first = invalidParams[0] as { message?: string };
      if (first?.message) return first.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Đăng ký thất bại, vui lòng thử lại';
}

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await register({ username: username.trim(), email: email.trim(), password });
      router.push('/');
    } catch (err) {
      setErrorMsg(extractAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell hideRightRail>
      <section
        className="surface-card"
        style={{
          maxWidth: '460px',
          margin: '24px auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Tạo tài khoản SYNAPSE
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tham gia thảo luận, bình chọn và kết nối thời gian thực cùng cộng đồng kỹ thuật.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Username
            </span>
            <input
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={32}
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="vd: alice_devops"
              className="input-field"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@example.edu"
              className="input-field"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Mật khẩu (tối thiểu 8 ký tự)
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
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

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ width: '100%', padding: '10px 16px', marginTop: '4px' }}
          >
            {submitting ? 'Đang khởi tạo tài khoản...' : 'Đăng ký ngay'}
          </button>
        </form>

        <div
          style={{
            borderTop: '1px solid var(--border-divider)',
            paddingTop: '12px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Đã có tài khoản?</span>
          <Link href="/login" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
            Đăng nhập
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
