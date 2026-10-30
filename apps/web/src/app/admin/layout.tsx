'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/auth-context';
import { Navbar } from '../../components/navbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#222831', color: '#DFD0B8' }}>
        <Navbar />
        <div
          style={{
            maxWidth: '600px',
            margin: '6rem auto',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: '#948979',
            fontFamily: 'var(--font-mono)',
          }}
        >
          &gt; Đang xác thực thẩm quyền Quản trị viên...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#222831', color: '#DFD0B8' }}>
        <Navbar />
        <div
          style={{
            maxWidth: '520px',
            margin: '5rem auto',
            padding: '2.5rem',
            backgroundColor: '#393E46',
            borderRadius: '0px',
            border: '2px solid #948979',
            boxShadow: '4px 4px 0px #948979',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '0px',
              backgroundColor: '#222831',
              border: '2px solid #948979',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: '#DFD0B8',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="0" ry="0" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 0.75rem 0', color: '#DFD0B8', fontFamily: 'var(--font-mono)' }}>
            [!] YÊU CẦU ĐĂNG NHẬP ADMIN
          </h2>
          <p style={{ color: '#948979', marginBottom: '1.75rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Phân hệ Quản trị yêu cầu đăng nhập bằng tài khoản có vai trò Quản trị viên (ADMIN) của Acad Community.
          </p>
          <Link
            href="/login?redirect=/admin"
            style={{
              display: 'inline-block',
              padding: '0.65rem 1.75rem',
              backgroundColor: '#DFD0B8',
              color: '#222831',
              borderRadius: '0px',
              fontWeight: 800,
              textDecoration: 'none',
              fontSize: '0.875rem',
              border: '2px solid #948979',
              boxShadow: '3px 3px 0px #948979',
            }}
          >
            ĐĂNG NHẬP NGAY &rarr;
          </Link>
        </div>
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#222831', color: '#DFD0B8' }}>
        <Navbar />
        <div
          style={{
            maxWidth: '540px',
            margin: '5rem auto',
            padding: '2.5rem',
            backgroundColor: '#393E46',
            borderRadius: '0px',
            border: '2px solid #948979',
            boxShadow: '4px 4px 0px #948979',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '0px',
              backgroundColor: '#222831',
              border: '2px solid #948979',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: '#DFD0B8',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 0.75rem 0', color: '#DFD0B8', fontFamily: 'var(--font-mono)' }}>
            [403] TRUY CẬP BỊ TỪ CHỐI
          </h2>
          <p style={{ color: '#948979', marginBottom: '1.75rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Tài khoản hiện tại (<strong style={{ color: '#DFD0B8' }}>{user?.username}</strong>) có vai trò{' '}
            <strong style={{ fontFamily: 'var(--font-mono)', color: '#DFD0B8' }}>[{user?.role}]</strong>, không có thẩm quyền truy cập vào Phân hệ Quản trị ADMIN.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.65rem 1.75rem',
              backgroundColor: '#222831',
              color: '#DFD0B8',
              borderRadius: '0px',
              fontWeight: 800,
              textDecoration: 'none',
              border: '2px solid #948979',
              fontSize: '0.875rem',
              boxShadow: '3px 3px 0px #948979',
            }}
          >
            &larr; QUAY LẠI TRANG CHỦ
          </Link>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'CONSOLE // TỔNG QUAN', href: '/admin' },
    { label: 'QUẢN LÝ NGƯỜI DÙNG', href: '/admin/users' },
    { label: 'CỘNG ĐỒNG // SPACES', href: '/admin/spaces' },
    { label: 'BÀI VIẾT // THREADS', href: '/admin/threads' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#222831', color: '#DFD0B8' }}>
      <Navbar />

      {/* ADMIN SUB-NAVBAR BRUTALIST DARK */}
      <div
        style={{
          backgroundColor: '#393E46',
          borderBottom: '2px solid #948979',
          padding: '0.75rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* TITLE BADGE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                padding: '0.25rem 0.65rem',
                backgroundColor: '#222831',
                color: '#DFD0B8',
                border: '1px solid #948979',
                fontWeight: 900,
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ADMIN.PANEL //
            </span>
            <span style={{ color: '#948979', fontSize: '0.8rem', fontWeight: 600 }}>
              Trung Tâm Điều Hành &amp; Kiểm Soát Hệ Thống
            </span>
          </div>

          {/* NAV TABS */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: '0.4rem 0.85rem',
                    backgroundColor: isActive ? '#DFD0B8' : '#222831',
                    color: isActive ? '#222831' : '#DFD0B8',
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    border: '2px solid #948979',
                    boxShadow: isActive ? '2px 2px 0px #DFD0B8' : '2px 2px 0px #948979',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1360px', margin: '2rem auto', padding: '0 1.25rem' }}>
        {children}
      </div>
    </div>
  );
}
