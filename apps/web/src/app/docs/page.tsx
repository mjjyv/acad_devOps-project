'use client';

import React from 'react';
import Link from 'next/link';
import { STAGES_PROGRESS, CHEAT_SHEETS } from '../../lib/docs-data/index.js';
import { CodeBlock } from '../../components/docs/code-block.js';
import { CalloutNote } from '../../components/docs/callout-note.js';

export default function DocsHomePage() {
  const overallCompletedPercent = Math.round(
    STAGES_PROGRESS.reduce((acc, curr) => acc + curr.completedPercent, 0) / STAGES_PROGRESS.length,
  );

  return (
    <main style={{ padding: '2rem 3rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* HERO BANNER */}
      <div
        style={{
          padding: '2.5rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid #334155',
          marginBottom: '2.5rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '2rem' }}>🏛️</span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            Cổng Tài Liệu & Kiến Trúc Dự Án
          </h1>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: '1.6', margin: '0 0 1.5rem 0' }}>
          Tra cứu toàn diện các hồ sơ kiến trúc, đặc tả an ninh phân quyền RBAC/ABAC, lược đồ CSDL PostgreSQL 16
          mở rộng với ltree, động cơ Redis Lua, hướng dẫn DevOps và bảng tiến độ 7 giai đoạn.
        </p>

        {/* THỐNG KÊ NHANH */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#131926', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TIẾN ĐỘ DỰ ÁN</div>
            <div style={{ color: '#38bdf8', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
              {overallCompletedPercent}%
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>3.5 / 7 Giai đoạn hoàn tất</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#131926', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>KIỂM THỬ TỰ ĐỘNG</div>
            <div style={{ color: '#10b981', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
              45 / 45
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>100% Tests Monorepo PASS</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#131926', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TÍNH TOÀN VẸN KIỂU</div>
            <div style={{ color: '#a855f7', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
              8 / 8
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>Packages & Apps Typecheck OK</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#131926', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>CHECKLIST CHI TIẾT</div>
            <div style={{ color: '#f59e0b', fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
              2050
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>Dòng đặc tả quy chuẩn</div>
          </div>
        </div>
      </div>

      <CalloutNote type="important" title="Nguyên tắc Vận hành Dự án">
        Dự án áp dụng quy chuẩn <strong>Up GitHub sau mỗi lần hoàn thành phân hệ</strong>, đồng thời tất cả các commit phải
        vượt qua 4 cổng kiểm định CI/CD tự động (Linting ➔ Typecheck ➔ Unit/Integration Tests ➔ Docker Syntax Check).
      </CalloutNote>

      {/* QUICK ACCESS CARDS */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '2rem 0 1rem 0', color: '#f8fafc' }}>
        Tài Liệu Trọng Điểm
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <Link
          href="/docs/discovery/prd-discovery"
          style={{
            padding: '1.5rem',
            backgroundColor: '#131926',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎯</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            Hồ sơ Yêu cầu PRD & 5 Luồng Cốt lõi
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            Định vị sản phẩm, OKRs kinh doanh, 3 chân dung người dùng và 5 luồng tương tác nền tảng.
          </p>
        </Link>

        <Link
          href="/docs/security/auth-security"
          style={{
            padding: '1.5rem',
            backgroundColor: '#131926',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#10b981')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔐</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            An ninh, RBAC/ABAC & Token Rotation
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            Giao thức xoay vòng Refresh Token kép, Grace Period 30s chống race condition và cơ chế hủy session.
          </p>
        </Link>

        <Link
          href="/docs/architecture/architecture-design"
          style={{
            padding: '1.5rem',
            backgroundColor: '#131926',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#a855f7')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🗄️</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            CSDL PostgreSQL 16 ltree & Redis Lua
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            Mã hóa ltree Base36, bộ đếm nguyên tử thread_counters, Lua script voting và thuật toán O(N) flatten tree.
          </p>
        </Link>

        <Link
          href="/docs/devops/devops-guide"
          style={{
            padding: '1.5rem',
            backgroundColor: '#131926',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f59e0b')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🐳</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            Vận hành DevOps, Docker & CI/CD
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            Điều phối Docker Compose 4 containers, tối ưu Dockerfile &lt;100MB và kịch bản keep-alive Render.
          </p>
        </Link>

        <Link
          href="/docs/checklist"
          style={{
            padding: '1.5rem',
            backgroundColor: '#131926',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ec4899')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            Bảng Theo Dõi Tiến Độ Checklist 7 Giai Đoạn
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            Theo dõi trực quan trạng thái từng tác vụ trong 2050 dòng checklist từ Giai đoạn 1 đến Giai đoạn 7.
          </p>
        </Link>

        <Link
          href="/docs/plans/plans-history"
          style={{
            padding: '1.5rem',
            backgroundColor: '#131926',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📜</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            Biên Niên Sử & Kế Hoạch Triển Khai
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            Lưu trữ toàn bộ các implementation plans và báo cáo walkthrough chi tiết qua từng cột mốc.
          </p>
        </Link>
      </div>

      {/* QUICK CHEAT SHEET HIGHLIGHTS */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '2rem 0 1rem 0', color: '#f8fafc' }}>
        Ghi Chú Kỹ Thuật Nhanh (Cheat Sheets)
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {CHEAT_SHEETS.slice(0, 4).map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '1.25rem',
              backgroundColor: '#131926',
              borderRadius: '8px',
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '1rem' }}>{item.title}</div>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', backgroundColor: '#1e3a5f', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                {item.category}
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 0.75rem 0' }}>{item.explanation}</p>
            <CodeBlock code={item.commandOrSnippet} />
          </div>
        ))}
      </div>
    </main>
  );
}
