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
    <main style={{ padding: '2rem 3rem', maxWidth: '1100px', margin: '0 auto', color: '#DFD0B8' }}>
      {/* HERO BANNER BRUTALIST DARK */}
      <div
        style={{
          padding: '2rem',
          backgroundColor: '#393E46',
          border: '2px solid #948979',
          boxShadow: '4px 4px 0px #948979',
          marginBottom: '2.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              backgroundColor: '#222831',
              color: '#DFD0B8',
              border: '1px solid #948979',
              fontWeight: 900,
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ARCHITECTURE // DOCS
          </span>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 900,
              margin: 0,
              fontFamily: 'var(--font-mono)',
              color: '#DFD0B8',
            }}
          >
            CỔNG TÀI LIỆU &amp; QUY CHUẨN KỸ THUẬT
          </h1>
        </div>
        <p style={{ color: '#948979', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 1.5rem 0' }}>
          Tra cứu toàn diện các hồ sơ kiến trúc, đặc tả an ninh phân quyền RBAC/ABAC, lược đồ CSDL PostgreSQL 16
          mở rộng với ltree, thuật toán Gravity Decay, hướng dẫn DevOps và bảng tiến độ 7 giai đoạn.
        </p>

        {/* THỐNG KÊ NHANH BRUTALIST */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#222831', border: '1px solid #948979', boxShadow: '2px 2px 0px #948979' }}>
            <div style={{ color: '#948979', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>TIẾN ĐỘ DỰ ÁN</div>
            <div style={{ color: '#DFD0B8', fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
              {overallCompletedPercent}%
            </div>
            <div style={{ color: '#948979', fontSize: '0.75rem', marginTop: '0.25rem' }}>Hoàn tất Làn sóng 1 &amp; 2</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#222831', border: '1px solid #948979', boxShadow: '2px 2px 0px #948979' }}>
            <div style={{ color: '#948979', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>KIỂM THỬ TỰ ĐỘNG</div>
            <div style={{ color: '#DFD0B8', fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
              71 / 71
            </div>
            <div style={{ color: '#948979', fontSize: '0.75rem', marginTop: '0.25rem' }}>100% Tests Monorepo PASS</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#222831', border: '1px solid #948979', boxShadow: '2px 2px 0px #948979' }}>
            <div style={{ color: '#948979', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>TÍNH TOÀN VẸN KIỂU</div>
            <div style={{ color: '#DFD0B8', fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
              8 / 8
            </div>
            <div style={{ color: '#948979', fontSize: '0.75rem', marginTop: '0.25rem' }}>Packages &amp; Apps Typecheck OK</div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#222831', border: '1px solid #948979', boxShadow: '2px 2px 0px #948979' }}>
            <div style={{ color: '#948979', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>CHECKLIST CHI TIẾT</div>
            <div style={{ color: '#DFD0B8', fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
              2050
            </div>
            <div style={{ color: '#948979', fontSize: '0.75rem', marginTop: '0.25rem' }}>Dòng đặc tả quy chuẩn</div>
          </div>
        </div>
      </div>

      <CalloutNote type="important" title="Nguyên tắc Vận hành Dự án">
        Dự án áp dụng quy chuẩn <strong>Up GitHub sau mỗi lần hoàn thành phân hệ</strong>, đồng thời tất cả các commit phải
        vượt qua 4 cổng kiểm định CI/CD tự động (Linting &rarr; Typecheck &rarr; Unit/Integration Tests &rarr; Next.js Build).
      </CalloutNote>

      {/* QUICK ACCESS CARDS */}
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 900,
          margin: '2.5rem 0 1rem 0',
          color: '#DFD0B8',
          fontFamily: 'var(--font-mono)',
          borderBottom: '2px solid #948979',
          paddingBottom: '0.5rem',
        }}
      >
        // TÀI LIỆU TRỌNG ĐIỂM
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <Link
          href="/docs/discovery/prd-discovery"
          style={{
            padding: '1.5rem',
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            boxShadow: '3px 3px 0px #948979',
            textDecoration: 'none',
          }}
        >
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', color: '#DFD0B8', fontWeight: 900 }}>
            [01] PRD &amp; 5 LUỒNG CỐT LÕI
          </div>
          <p style={{ color: '#948979', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
            Định vị sản phẩm, OKRs kinh doanh, 3 chân dung người dùng và 5 luồng tương tác nền tảng.
          </p>
        </Link>

        <Link
          href="/docs/security/auth-security"
          style={{
            padding: '1.5rem',
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            boxShadow: '3px 3px 0px #948979',
            textDecoration: 'none',
          }}
        >
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', color: '#DFD0B8', fontWeight: 900 }}>
            [02] AN NINH &amp; TOKEN ROTATION
          </div>
          <p style={{ color: '#948979', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
            Giao thức xoay vòng Refresh Token kép, Grace Period 30s chống race condition và cơ chế hủy session.
          </p>
        </Link>

        <Link
          href="/docs/architecture/architecture-design"
          style={{
            padding: '1.5rem',
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            boxShadow: '3px 3px 0px #948979',
            textDecoration: 'none',
          }}
        >
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', color: '#DFD0B8', fontWeight: 900 }}>
            [03] CSDL POSTGRESQL 16 &amp; LTREE
          </div>
          <p style={{ color: '#948979', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
            Mã hóa ltree Base36, bộ đếm nguyên tử thread_counters, Lua script voting và thuật toán O(N) flatten tree.
          </p>
        </Link>

        <Link
          href="/docs/devops/devops-guide"
          style={{
            padding: '1.5rem',
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            boxShadow: '3px 3px 0px #948979',
            textDecoration: 'none',
          }}
        >
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', color: '#DFD0B8', fontWeight: 900 }}>
            [04] VẬN HÀNH DOCKER &amp; CI/CD
          </div>
          <p style={{ color: '#948979', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
            Điều phối Docker Compose 4 containers, tối ưu Dockerfile &lt;100MB và kịch bản keep-alive Render.
          </p>
        </Link>

        <Link
          href="/docs/checklist"
          style={{
            padding: '1.5rem',
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            boxShadow: '3px 3px 0px #948979',
            textDecoration: 'none',
          }}
        >
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', color: '#DFD0B8', fontWeight: 900 }}>
            [05] BẢNG CHECKLIST 7 GIAI ĐOẠN
          </div>
          <p style={{ color: '#948979', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
            Theo dõi trực quan trạng thái từng tác vụ trong 2050 dòng checklist từ Giai đoạn 1 đến Giai đoạn 7.
          </p>
        </Link>

        <Link
          href="/docs/plans/plans-history"
          style={{
            padding: '1.5rem',
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            boxShadow: '3px 3px 0px #948979',
            textDecoration: 'none',
          }}
        >
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', color: '#DFD0B8', fontWeight: 900 }}>
            [06] BIÊN NIÊN SỬ TRIỂN KHAI
          </div>
          <p style={{ color: '#948979', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
            Lưu trữ toàn bộ các implementation plans và báo cáo walkthrough chi tiết qua từng cột mốc.
          </p>
        </Link>
      </div>

      {/* QUICK CHEAT SHEET HIGHLIGHTS */}
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 900,
          margin: '2.5rem 0 1rem 0',
          color: '#DFD0B8',
          fontFamily: 'var(--font-mono)',
          borderBottom: '2px solid #948979',
          paddingBottom: '0.5rem',
        }}
      >
        // GHI CHÚ KỸ THUẬT NHANH (CHEAT SHEETS)
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {CHEAT_SHEETS.slice(0, 4).map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '1.25rem',
              backgroundColor: '#393E46',
              border: '2px solid #948979',
              boxShadow: '3px 3px 0px #948979',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 800, color: '#DFD0B8', fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
                {item.title}
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#DFD0B8',
                  backgroundColor: '#222831',
                  border: '1px solid #948979',
                  padding: '0.15rem 0.5rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {item.category}
              </span>
            </div>
            <p style={{ color: '#948979', fontSize: '0.85rem', margin: '0 0 0.75rem 0' }}>{item.explanation}</p>
            <CodeBlock code={item.commandOrSnippet} />
          </div>
        ))}
      </div>
    </main>
  );
}
