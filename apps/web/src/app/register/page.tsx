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
        backgroundColor: '#222831',
        color: '#DFD0B8',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '440px',
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
            // TẠO TÀI KHOẢN
          </h1>
          <p style={{ color: '#948979', fontSize: '0.82rem', margin: 0 }}>
            Gia nhập cộng đồng kỹ sư DevOps & Hạ tầng đám mây
          </p>
        </div>

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
              Tên người dùng (Username):
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="devops_ninja"
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
            <span style={{ fontSize: '0.7rem', color: '#948979' }}>Chỉ gồm chữ thường không dấu, số và gạch dưới.</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.35rem', color: '#948979', textTransform: 'uppercase' }}>
              Địa chỉ Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ky-su@domain.com"
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
              placeholder="Tối thiểu 8 ký tự (hoa, thường, số)"
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
            {isLoading ? 'ĐANG TẠO TÀI KHOẢN...' : 'XÁC NHẬN ĐĂNG KÝ'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.82rem', color: '#948979', margin: '1.5rem 0 0 0' }}>
          Đã có tài khoản?{' '}
          <Link href="/login" style={{ color: '#DFD0B8', fontWeight: 800, textDecoration: 'underline' }}>
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </main>
  );
}
