'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/auth-context';

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
          maxWidth: '420px',
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
            Gia Nhập Cộng Đồng
          </h1>
          <p style={{ color: '#787774', fontSize: '0.82rem', margin: 0 }}>
            Khởi tạo hồ sơ kỹ sư và tham gia thảo luận chuyên sâu
          </p>
        </div>

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
              Tên người dùng (Username)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="dung_devops"
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
              Địa chỉ Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@domain.com"
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
              Mật khẩu bảo mật
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự (hoa, thường, số)"
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
            {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.82rem', color: '#787774', margin: '1.5rem 0 0 0' }}>
          Đã có tài khoản?{' '}
          <Link href="/login" style={{ color: '#12544F', fontWeight: 600, textDecoration: 'none' }}>
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}
