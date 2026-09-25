'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/auth-context';
import { Navbar } from '../../components/navbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0b0f17', color: '#f8fafc' }}>
        <Navbar />
        <div style={{ maxWidth: '900px', margin: '4rem auto', textAlign: 'center' }}>
          Đang xác thực quyền hạn Quản trị viên...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0b0f17', color: '#f8fafc' }}>
        <Navbar />
        <div style={{ maxWidth: '600px', margin: '5rem auto', padding: '2rem', backgroundColor: '#131926', borderRadius: '12px', border: '1px solid #1e293b', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Yêu Cầu Đăng Nhập</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Khu vực Quản trị viên yêu cầu đăng nhập tài khoản có thẩm quyền.
          </p>
          <Link
            href="/login?redirect=/admin/users"
            style={{
              display: 'inline-block',
              padding: '0.65rem 1.5rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
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
      <div style={{ minHeight: '100vh', backgroundColor: '#0b0f17', color: '#f8fafc' }}>
        <Navbar />
        <div style={{ maxWidth: '600px', margin: '5rem auto', padding: '2rem', backgroundColor: '#1f1315', borderRadius: '12px', border: '1px solid #7f1d1d', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⛔</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#f87171' }}>
            Truy Cập Bị Từ Chối (403 Forbidden)
          </h2>
          <p style={{ color: '#fca5a5', marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Tài khoản hiện tại của bạn (<strong>{user?.username}</strong>) có vai trò là{' '}
            <strong style={{ textDecoration: 'underline' }}>{user?.role}</strong>, không có quyền truy cập vào Phân hệ Quản trị ADMIN.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.65rem 1.5rem',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid #334155',
            }}
          >
            Về Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0f17', color: '#f8fafc' }}>
      <Navbar />

      {/* ADMIN SUB-BANNER */}
      <div style={{ backgroundColor: '#1c1917', borderBottom: '1px solid #44403c', padding: '0.5rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ padding: '0.15rem 0.5rem', backgroundColor: '#dc2626', color: '#ffffff', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
              ADMIN CONSOLE
            </span>
            <span style={{ color: '#d6d3d1' }}>Bảng điều khiển & An ninh hệ thống Acad Community</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/admin/users" style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 600 }}>
              Quản lý Người dùng
            </Link>
            <Link href="/docs/security/auth-security" style={{ color: '#a8a29e', textDecoration: 'none' }}>
              Quy chuẩn An ninh
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '2rem auto', padding: '0 1.5rem' }}>
        {children}
      </div>
    </div>
  );
}
