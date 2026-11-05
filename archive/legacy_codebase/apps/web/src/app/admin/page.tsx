'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { communityClient } from '../../lib/community-client';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await communityClient.adminFetchStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải số liệu thống kê hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* HEADER SECTION */}
      <div
        style={{
          backgroundColor: '#393E46',
          border: '2px solid #948979',
          padding: '1.75rem',
          boxShadow: '4px 4px 0px #948979',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#948979',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '0.25rem',
            }}
          >
            SYSTEM OVERVIEW // LIVE METRICS
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 900,
              color: '#DFD0B8',
              margin: 0,
              fontFamily: 'var(--font-mono)',
            }}
          >
            BẢNG ĐIỀU KHIỂN HỆ THỐNG
          </h1>
          <p style={{ color: '#948979', margin: '0.4rem 0 0 0', fontSize: '0.85rem' }}>
            Giám sát thời gian thực người dùng, phiên bảo mật, không gian cộng đồng và nội dung bài viết.
          </p>
        </div>

        <button
          onClick={loadStats}
          disabled={loading}
          style={{
            padding: '0.55rem 1.25rem',
            backgroundColor: '#222831',
            color: '#DFD0B8',
            border: '2px solid #948979',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '3px 3px 0px #948979',
          }}
        >
          {loading ? '[ ĐANG TẢI... ]' : '[ TẢI LẠI SỐ LIỆU ]'}
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            borderLeft: '6px solid #ff5555',
            padding: '1rem',
            color: '#ff5555',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          [LỖI]: {error}
        </div>
      )}

      {/* METRICS GRID BRUTALIST */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* USERS */}
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            padding: '1.25rem',
            boxShadow: '3px 3px 0px #948979',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#948979', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            TỔNG NGƯỜI DÙNG
          </div>
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: '#DFD0B8',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.2,
              margin: '0.5rem 0',
            }}
          >
            {stats ? stats.totalUsers ?? 0 : '--'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#948979' }}>
            Active: <span style={{ color: '#DFD0B8', fontWeight: 700 }}>{stats?.activeUsers ?? 0}</span> | Khóa:{' '}
            <span style={{ color: '#ff7777', fontWeight: 700 }}>{stats?.suspendedUsers ?? 0}</span>
          </div>
        </div>

        {/* ACTIVE SESSIONS */}
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            padding: '1.25rem',
            boxShadow: '3px 3px 0px #948979',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#948979', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            PHIÊN HOẠT ĐỘNG
          </div>
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: '#DFD0B8',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.2,
              margin: '0.5rem 0',
            }}
          >
            {stats ? stats.activeSessions ?? 0 : '--'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#948979' }}>
            Rotation: <span style={{ color: '#DFD0B8', fontWeight: 700 }}>Scrypt KDF</span> | Token: 15m
          </div>
        </div>

        {/* SPACES */}
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            padding: '1.25rem',
            boxShadow: '3px 3px 0px #948979',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#948979', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            KHÔNG GIAN (SPACES)
          </div>
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: '#DFD0B8',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.2,
              margin: '0.5rem 0',
            }}
          >
            {stats ? stats.spacesCount ?? 0 : '--'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#948979' }}>
            DevOps &amp; Security Engineering Spaces
          </div>
        </div>

        {/* THREADS */}
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            padding: '1.25rem',
            boxShadow: '3px 3px 0px #948979',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#948979', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            BÀI VIẾT (THREADS)
          </div>
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: '#DFD0B8',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.2,
              margin: '0.5rem 0',
            }}
          >
            {stats ? stats.threadsCount ?? 0 : '--'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#948979' }}>
            Bình luận:{' '}
            <span style={{ color: '#DFD0B8', fontWeight: 700 }}>{stats?.commentsCount ?? 0}</span> (Ltree path)
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS & ARCHITECTURE SUMMARY */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* QUICK ACTIONS */}
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            padding: '1.5rem',
            boxShadow: '4px 4px 0px #948979',
          }}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 900,
              color: '#DFD0B8',
              margin: '0 0 1.25rem 0',
              fontFamily: 'var(--font-mono)',
              borderBottom: '2px solid #948979',
              paddingBottom: '0.5rem',
            }}
          >
            LỐI TẮT QUẢN TRỊ // QUICK ACTIONS
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <Link
              href="/admin/users"
              style={{
                display: 'block',
                padding: '0.85rem 1rem',
                backgroundColor: '#222831',
                color: '#DFD0B8',
                textDecoration: 'none',
                border: '2px solid #948979',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                fontWeight: 700,
                boxShadow: '2px 2px 0px #948979',
              }}
            >
              &rarr; [01] QUẢN LÝ NGƯỜI DÙNG &amp; SỐ BÀI VIẾT
            </Link>

            <Link
              href="/admin/spaces"
              style={{
                display: 'block',
                padding: '0.85rem 1rem',
                backgroundColor: '#222831',
                color: '#DFD0B8',
                textDecoration: 'none',
                border: '2px solid #948979',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                fontWeight: 700,
                boxShadow: '2px 2px 0px #948979',
              }}
            >
              &rarr; [02] QUẢN LÝ KHÔNG GIAN THẢO LUẬN (SPACES)
            </Link>

            <Link
              href="/admin/threads"
              style={{
                display: 'block',
                padding: '0.85rem 1rem',
                backgroundColor: '#222831',
                color: '#DFD0B8',
                textDecoration: 'none',
                border: '2px solid #948979',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                fontWeight: 700,
                boxShadow: '2px 2px 0px #948979',
              }}
            >
              &rarr; [03] QUẢN LÝ BÀI VIẾT, GHIM &amp; KIỂM DUYỆT
            </Link>

            <Link
              href="/settings/sessions"
              style={{
                display: 'block',
                padding: '0.85rem 1rem',
                backgroundColor: '#222831',
                color: '#DFD0B8',
                textDecoration: 'none',
                border: '2px solid #948979',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                fontWeight: 700,
                boxShadow: '2px 2px 0px #948979',
              }}
            >
              &rarr; [04] QUẢN LÝ PHIÊN LÀM VIỆC ĐA THIẾT BỊ
            </Link>
          </div>
        </div>

        {/* SYSTEM STATUS INFO */}
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            padding: '1.5rem',
            boxShadow: '4px 4px 0px #948979',
          }}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 900,
              color: '#DFD0B8',
              margin: '0 0 1.25rem 0',
              fontFamily: 'var(--font-mono)',
              borderBottom: '2px solid #948979',
              paddingBottom: '0.5rem',
            }}
          >
            HẠ TẦNG &amp; AN NINH // SPECS
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              color: '#948979',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222831', paddingBottom: '0.4rem' }}>
              <span>RUNTIME KERNEL:</span>
              <strong style={{ color: '#DFD0B8' }}>Node.js 22 LTS (ESM)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222831', paddingBottom: '0.4rem' }}>
              <span>DATABASE STORE:</span>
              <strong style={{ color: '#DFD0B8' }}>PostgreSQL 16 + Resilient Fallback</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222831', paddingBottom: '0.4rem' }}>
              <span>COMMENT TREE:</span>
              <strong style={{ color: '#DFD0B8' }}>ltree Base36 (Giới hạn 10 cấp)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222831', paddingBottom: '0.4rem' }}>
              <span>VOTE ALGORITHM:</span>
              <strong style={{ color: '#DFD0B8' }}>Gravity Decay Engine (G=1.8)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222831', paddingBottom: '0.4rem' }}>
              <span>PASSWORD KDF:</span>
              <strong style={{ color: '#DFD0B8' }}>Scrypt KDF (N=16384, r=8, p=1)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>DEPLOY TARGET:</span>
              <strong style={{ color: '#DFD0B8' }}>Render Web Services (Auto CI/CD)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
