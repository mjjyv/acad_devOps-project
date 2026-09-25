'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/auth-context.js';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error: authError } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 8) {
      setLocalError('Mật khẩu phải có tối thiểu 8 ký tự');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setLocalError('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số');
      return;
    }

    try {
      await register({ username, email, password });
      router.push('/');
    } catch (err: any) {
      setLocalError(err.message || 'Đăng ký không thành công');
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#f8fafc', padding: '1rem' }}>
      <div style={{ maxWidth: '440px', width: '100%', background: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', border: '1px solid #334155' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>Tạo tài khoản mới</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Gia nhập mạng xã hội thảo luận kỹ nghệ công nghệ
        </p>

        {(localError || authError) && (
          <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {localError || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.375rem', color: '#cbd5e1' }}>
              Tên người dùng (Username)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="dev_pro_99"
              style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#f8fafc', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.375rem', color: '#cbd5e1' }}>
              Địa chỉ Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#f8fafc', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.375rem', color: '#cbd5e1' }}>
              Mật khẩu bảo mật
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự (hoa, thường, số)"
              style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#f8fafc', boxSizing: 'border-box' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '0.75rem',
              background: isLoading ? '#64748b' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '0.5rem',
              transition: 'background 0.2s',
            }}
          >
            {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
          Đã có tài khoản?{' '}
          <a href="/login" style={{ color: '#38bdf8', textDecoration: 'none' }}>
            Đăng nhập ngay
          </a>
        </p>
      </div>
    </main>
  );
}
