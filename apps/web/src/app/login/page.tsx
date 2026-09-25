'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/auth-context.js';

export default function LoginPage() {
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
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#f8fafc', padding: '1rem' }}>
      <div style={{ maxWidth: '420px', width: '100%', background: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', border: '1px solid #334155' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>Đăng nhập</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Cộng đồng học tập & phát triển kỹ nghệ IT / DevOps
        </p>

        {reason === 'session_expired' && (
          <div style={{ padding: '0.75rem', background: '#fef08a', color: '#854d0e', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.
          </div>
        )}

        {(localError || authError) && (
          <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {localError || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.375rem', color: '#cbd5e1' }}>
              Email hoặc Tên người dùng
            </label>
            <input
              type="text"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder="name@example.com hoặc username"
              style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#f8fafc', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.375rem', color: '#cbd5e1' }}>
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#f8fafc', boxSizing: 'border-box' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '0.75rem',
              background: isLoading ? '#64748b' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '0.5rem',
              transition: 'background 0.2s',
            }}
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
          Chưa có tài khoản?{' '}
          <a href="/register" style={{ color: '#38bdf8', textDecoration: 'none' }}>
            Đăng ký ngay
          </a>
        </p>
      </div>
    </main>
  );
}
