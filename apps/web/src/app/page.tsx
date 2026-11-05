export default function HomePage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://acad-core-api.onrender.com';

  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <header
        style={{
          marginBottom: '2.5rem',
          borderBottom: '3px solid #948979',
          paddingBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '2.2rem',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
              }}
            >
              ACAD DEVOPS DISCUSSION ENGINE
            </h1>
            <p style={{ color: '#948979', fontWeight: 600, fontSize: '0.95rem' }}>
              Zero-Base Clean Rebuild v2.0 • Backend-First Architecture
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="status-indicator" />
            <span
              style={{
                fontWeight: 800,
                fontSize: '0.85rem',
                color: '#22c55e',
                textTransform: 'uppercase',
              }}
            >
              SYSTEM STATUS: OPERATIONAL
            </span>
          </div>
        </div>
      </header>

      <section className="brutalist-card">
        <h2
          style={{
            fontSize: '1.25rem',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Hạ Tầng Backend & Cổng API Gateway
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          Phân hệ Backend (Stream B) đang vận hành trên nền tảng Node.js 22, PostgreSQL 16 và Redis
          7, đảm bảo tính toàn vẹn dữ liệu và triệt tiêu race condition bằng các thuật toán phân tán
          chuyên sâu.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a
            href={`${apiUrl}/healthz`}
            target="_blank"
            rel="noopener noreferrer"
            className="brutalist-button"
          >
            Kiểm Tra Sức Khỏe (/healthz)
          </a>
          <a
            href="https://github.com/mjjyv/acad_devOps-project"
            target="_blank"
            rel="noopener noreferrer"
            className="brutalist-button"
            style={{ backgroundColor: '#393e46', color: '#dfd0b8' }}
          >
            Kho Mã Nguồn GitHub
          </a>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div className="brutalist-card">
          <span className="brutalist-badge">Phase B0 & B1</span>
          <h3 style={{ margin: '0.8rem 0 0.5rem', fontSize: '1.1rem' }}>
            Identity & Session Shield
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#ccc' }}>
            Bảo vệ OWASP ASVS Level 2+, Dual Token Rotation (Access 15m + Refresh 7d), Grace Period
            30s, Mutex Lock chống bão yêu cầu.
          </p>
        </div>

        <div className="brutalist-card">
          <span className="brutalist-badge">Phase B2</span>
          <h3 style={{ margin: '0.8rem 0 0.5rem', fontSize: '1.1rem' }}>
            Spaces & ltree Nested CMS
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#ccc' }}>
            Không gian thảo luận (/s/[slug]), cây bình luận PostgreSQL ltree Base36 4 ký tự/tầng,
            Capped Depth 8, Presigned PUT upload Zero-Hop.
          </p>
        </div>

        <div className="brutalist-card">
          <span className="brutalist-badge">Phase B3</span>
          <h3 style={{ margin: '0.8rem 0 0.5rem', fontSize: '1.1rem' }}>
            Atomic Lua Voting & Feeds
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#ccc' }}>
            Bỏ phiếu nguyên tử O(1) Redis Lua, tối ưu HOT updates fillfactor 70, Hacker News Gravity
            Decay (G=1.8), Wilson Score Confidence Interval.
          </p>
        </div>
      </section>

      <footer
        style={{
          borderTop: '2px solid #393e46',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.85rem',
          color: '#948979',
        }}
      >
        <span>ACAD DevOps Fullstack Monorepo v2.0</span>
        <span>Render Cloud Deployment Active</span>
      </footer>
    </main>
  );
}
