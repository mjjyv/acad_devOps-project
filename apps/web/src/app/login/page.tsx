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
  return err instanceof Error ? err.message : 'Đăng nhập thất bại, vui lòng thử lại';
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [identifier, setIdentifier] = useState('');
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
      await login({ identifier: identifier.trim(), password });
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
            Đăng nhập SYNAPSE
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Sử dụng username hoặc email đã đăng ký cùng mật khẩu của bạn.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Username hoặc Email
            </span>
            <input
              name="identifier"
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="vd: alice_dev"
              className="input-field"
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Mật khẩu
            </span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
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
            {submitting ? 'Đang xác thực...' : 'Đăng nhập'}
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
          <span>Chưa có tài khoản?</span>
          <Link href="/register" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
            Đăng ký tài khoản mới
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
