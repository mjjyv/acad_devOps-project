'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/auth-context';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const reason = searchParams.get('reason');

  const { login, isLoading, error: authError } = useAuth();
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!loginInput || !password) {
      setLocalError('Vui lòng điền đầy đủ tên đăng nhập/email và mật khẩu');
      return;
    }

    try {
      await login({ login: loginInput, password });
      router.push(redirectUrl);
    } catch (err: any) {
      setLocalError(err.message || 'Đăng nhập không thành công');
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5EFE3',
        color: '#4A4A4A',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '400px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          padding: '2.5rem 2rem',
          borderRadius: '8px',
          border: '1px solid #E6DFD5',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#12544F',
              color: '#F5EFE3',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '-0.03em',
              marginBottom: '0.75rem',
            }}
          >
            A
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              margin: '0 0 0.35rem 0',
              color: '#1E2328',
              letterSpacing: '-0.02em',
            }}
          >
            Đăng Nhập
          </h1>
          <p style={{ color: '#787774', fontSize: '0.82rem', margin: 0 }}>
            Cộng đồng kỹ nghệ DevOps & Kiến trúc hệ thống
          </p>
        </div>

        {reason === 'session_expired' && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#FDF6E2',
              color: '#8C6514',
              borderRadius: '6px',
              border: '1px solid #F5E5BE',
              fontSize: '0.8rem',
              marginBottom: '1rem',
            }}
          >
            Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
          </div>
        )}

        {(localError || authError) && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#FDEBEC',
              color: '#9F2F2D',
              borderRadius: '6px',
              border: '1px solid #FAD1D4',
              fontSize: '0.8rem',
              marginBottom: '1rem',
            }}
          >
            {localError || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1E2328' }}>
              Email hoặc Tên đăng nhập
            </label>
            <input
              type="text"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder="kỹ sư@example.com hoặc username"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #E6DFD5',
                backgroundColor: '#FAF7F2',
                color: '#1E2328',
                fontSize: '0.85rem',
                outline: 'none',
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1E2328' }}>
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #E6DFD5',
                backgroundColor: '#FAF7F2',
                color: '#1E2328',
                fontSize: '0.85rem',
                outline: 'none',
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '0.65rem',
              backgroundColor: isLoading ? '#787774' : '#12544F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '0.35rem',
            }}
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.82rem', color: '#787774', margin: '1.5rem 0 0 0' }}>
          Chưa có tài khoản?{' '}
          <Link href="/register" style={{ color: '#12544F', fontWeight: 600, textDecoration: 'none' }}>
            Tham gia ngay
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5EFE3', color: '#787774' }}>
          Đang nạp...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
