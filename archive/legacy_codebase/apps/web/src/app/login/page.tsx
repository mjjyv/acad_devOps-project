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
        backgroundColor: '#222831',
        color: '#DFD0B8',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          backgroundColor: '#393E46',
          padding: '2.5rem 2rem',
          borderRadius: '0px',
          border: '2px solid #948979',
          boxShadow: '4px 4px 0px #DFD0B8',
        }}
      >
        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              backgroundColor: '#DFD0B8',
              color: '#222831',
              borderRadius: '0px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.2rem',
              border: '2px solid #948979',
              boxShadow: '2px 2px 0px #948979',
              marginBottom: '0.75rem',
            }}
          >
            A
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              margin: '0 0 0.35rem 0',
              color: '#DFD0B8',
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            // ĐĂNG NHẬP
          </h1>
          <p style={{ color: '#948979', fontSize: '0.82rem', margin: 0 }}>
            Nền tảng kỹ nghệ DevOps & Kiến trúc hệ thống
          </p>
        </div>

        {reason === 'session_expired' && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#222831',
              color: '#DFD0B8',
              border: '2px solid #948979',
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
              backgroundColor: '#222831',
              color: '#D96B6B',
              border: '2px solid #D96B6B',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            [LỖI]: {localError || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.35rem', color: '#948979', textTransform: 'uppercase' }}>
              Email hoặc Tên đăng nhập:
            </label>
            <input
              type="text"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder="kỹ sư@example.com hoặc username"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '0px',
                border: '2px solid #948979',
                backgroundColor: '#222831',
                color: '#DFD0B8',
                fontSize: '0.88rem',
                outline: 'none',
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.35rem', color: '#948979', textTransform: 'uppercase' }}>
              Mật khẩu:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '0px',
                border: '2px solid #948979',
                backgroundColor: '#222831',
                color: '#DFD0B8',
                fontSize: '0.88rem',
                outline: 'none',
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '0.7rem',
              backgroundColor: isLoading ? '#948979' : '#DFD0B8',
              color: '#222831',
              border: '2px solid #DFD0B8',
              borderRadius: '0px',
              fontWeight: 900,
              fontSize: '0.88rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '0.5rem',
              textTransform: 'uppercase',
              boxShadow: '3px 3px 0px #948979',
            }}
          >
            {isLoading ? 'ĐANG XÁC THỰC...' : 'XÁC NHẬN ĐĂNG NHẬP'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.82rem', color: '#948979', margin: '1.5rem 0 0 0' }}>
          Chưa có tài khoản?{' '}
          <Link href="/register" style={{ color: '#DFD0B8', fontWeight: 800, textDecoration: 'underline' }}>
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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#222831', color: '#DFD0B8', fontFamily: 'var(--font-mono)' }}>
          // ĐANG NẠP...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
