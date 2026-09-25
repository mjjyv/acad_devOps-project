'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/auth-context';
import { Navbar } from '../../components/navbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5EFE3', color: '#4A4A4A' }}>
        <Navbar />
        <div style={{ maxWidth: '600px', margin: '6rem auto', textAlign: 'center', fontSize: '0.9rem', color: '#787774' }}>
          Đang xác thực thẩm quyền Quản trị viên...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5EFE3', color: '#4A4A4A' }}>
        <Navbar />
        <div
          style={{
            maxWidth: '520px',
            margin: '5rem auto',
            padding: '2.5rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E6DFD5',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: '#FAF7F2',
              border: '1px solid #E6DFD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: '#12544F',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: '#1E2328' }}>
            Yêu Cầu Đăng Nhập Quản Trị
          </h2>
          <p style={{ color: '#787774', marginBottom: '1.75rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
            Phân hệ Quản trị ADMIN yêu cầu đăng nhập tài khoản có thẩm quyền cấp cao của hệ thống Acad Community.
          </p>
          <Link
            href="/login?redirect=/admin/users"
            style={{
              display: 'inline-block',
              padding: '0.55rem 1.5rem',
              backgroundColor: '#12544F',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5EFE3', color: '#4A4A4A' }}>
        <Navbar />
        <div
          style={{
            maxWidth: '540px',
            margin: '5rem auto',
            padding: '2.5rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E6DFD5',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: '#FDEBEC',
              border: '1px solid #FAD1D4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: '#9F2F2D',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: '#9F2F2D' }}>
            Truy Cập Bị Từ Chối (403 Forbidden)
          </h2>
          <p style={{ color: '#4A4A4A', marginBottom: '1.75rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Tài khoản hiện tại của bạn (<strong>{user?.username}</strong>) có vai trò là{' '}
            <strong style={{ fontFamily: 'var(--font-mono)', color: '#12544F' }}>{user?.role}</strong>, không có thẩm quyền truy cập vào Phân hệ Quản trị ADMIN.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.55rem 1.5rem',
              backgroundColor: '#FAF7F2',
              color: '#4A4A4A',
              borderRadius: '6px',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid #E6DFD5',
              fontSize: '0.875rem',
            }}
          >
            Quay lại Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5EFE3', color: '#4A4A4A' }}>
      <Navbar />

      {/* ADMIN SUB-BANNER (EDITORIAL MINIMALIST) */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E6DFD5', padding: '0.65rem 1.5rem' }}>
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                padding: '0.2rem 0.55rem',
                backgroundColor: '#EAF2F1',
                color: '#12544F',
                borderRadius: '4px',
                fontWeight: 700,
                fontSize: '0.72rem',
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ADMIN CONSOLE
            </span>
            <span style={{ color: '#787774' }}>Phân hệ Kiểm soát Người dùng & An ninh Hệ thống</span>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <Link
              href="/admin/users"
              style={{
                color: '#12544F',
                textDecoration: 'none',
                fontWeight: 600,
                borderBottom: '2px solid #12544F',
                paddingBottom: '2px',
              }}
            >
              Quản lý Người dùng
            </Link>
            <Link href="/docs" style={{ color: '#787774', textDecoration: 'none' }}>
              Quy chuẩn Kỹ thuật
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1360px', margin: '2rem auto', padding: '0 1.25rem' }}>{children}</div>
    </div>
  );
}
