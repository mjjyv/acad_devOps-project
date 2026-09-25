import Link from 'next/link';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#0b0f17',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3rem 1.5rem',
      }}
    >
      {/* HEADER NAV */}
      <nav
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.25rem', fontWeight: 800 }}>
          <span>🏛️</span>
          <span>Acad Community Platform</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link
            href="/docs"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              backgroundColor: '#1e3a5f',
              color: '#38bdf8',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            📚 Tài Liệu Kỹ Thuật (/docs)
          </Link>

          <Link
            href="/login"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              fontWeight: 500,
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            Đăng nhập
          </Link>

          <Link
            href="/register"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            Đăng ký
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div style={{ maxWidth: '800px', textAlign: 'center', marginBottom: '3.5rem' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: '#064e3b',
            color: '#6ee7b7',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          ✓ Giai đoạn 4.1 Auth Subsystem đã hoàn tất với 45/45 Tests PASS
        </div>

        <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: '0 0 1rem 0', letterSpacing: '-0.03em', lineHeight: '1.2' }}>
          Nền Tảng Mạng Xã Hội & Diễn Đàn Kỹ Nghệ DevOps Doanh Nghiệp
        </h1>

        <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 2rem 0' }}>
          Hệ sinh thái thảo luận chuyên sâu tối ưu hóa cho đọc tải cao, phân cấp bình luận vô hạn bằng PostgreSQL ltree,
          động cơ Redis Lua nguyên tử, và bảo mật định danh kép Token Rotation Protocol.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link
            href="/docs"
            style={{
              padding: '0.75rem 1.75rem',
              borderRadius: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1rem',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            }}
          >
            📖 Mở Cổng Tài Liệu & Kiến Trúc
          </Link>

          <Link
            href="/docs/checklist"
            style={{
              padding: '0.75rem 1.75rem',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontWeight: 600,
              fontSize: '1rem',
              textDecoration: 'none',
            }}
          >
            📋 Xem Checklist 7 Giai Đoạn
          </Link>
        </div>
      </div>

      {/* FEATURE PILLARS */}
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
        }}
      >
        <div style={{ padding: '1.5rem', backgroundColor: '#131926', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔐</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            Zero-Trust Auth & Session
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            Token Rotation kép, Grace Period 30s chống race conditions mạng và phát hiện tấn công tái sử dụng token.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: '#131926', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            PostgreSQL 16 & Redis Lua
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            Bình luận phân cấp ltree Base36, bộ đếm nguyên tử thread_counters và bình chọn tốc độ cao O(1).
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: '#131926', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🐳</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            Docker & DevOps CI/CD
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            Multi-stage build &lt;100MB, pipeline 4 cổng kiểm định tự động trên GitHub Actions và Blueprint Render Cloud.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: '#131926', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            2050 Dòng Checklist Số Hóa
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
            Theo dõi trực quan tiến độ từng task qua 7 giai đoạn, tra cứu cheat sheets và quy chuẩn kỹ thuật.
          </p>
        </div>
      </div>
    </main>
  );
}
