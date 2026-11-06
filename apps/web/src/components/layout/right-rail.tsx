'use client';

import { useUI } from '../../lib/store/ui-context';
import { TrashIcon } from '../ui/icons';

export function RightRail() {
  const { recentPosts, clearRecentPosts, showToast } = useUI();

  return (
    <aside
      style={{
        width: 'var(--rail-width)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'sticky',
        top: 'calc(var(--header-height) + 16px)',
        height: 'fit-content',
      }}
      className="app-right-rail"
    >
      {/* 1. RECENT POSTS WIDGET */}
      {recentPosts.length > 0 && (
        <div className="reddit-card" style={{ padding: '12px 14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Recent Posts
            </span>
            <button
              type="button"
              onClick={clearRecentPosts}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-brand)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <TrashIcon size={12} />
              <span>Clear</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => showToast(`Xem bài viết: ${post.title}`)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {post.spaceName}
                    </span>
                    <span>•</span>
                    <span>{post.timeAgo}</span>
                  </div>
                  <h4
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      lineHeight: '1.4',
                      color: 'var(--text-primary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {post.title}
                  </h4>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <span>{post.upvotes} upvotes</span> • <span>{post.comments} comments</span>
                  </div>
                </div>

                {post.thumbnailUrl && (
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: '#272729',
                    }}
                  >
                    <img
                      src={post.thumbnailUrl}
                      alt={post.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. COMMUNITY & HOMELAB INFRASTRUCTURE WIDGET */}
      <div className="reddit-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            height: '40px',
            background: 'linear-gradient(135deg, #30364F 0%, #444C6E 50%, #E1D9BC 100%)',
          }}
        />
        <div style={{ padding: '14px 16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '-24px',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface)',
                border: '3px solid var(--bg-surface)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: 'var(--color-brand)',
                fontSize: '16px',
              }}
            >
              🚀
            </div>
            <div style={{ paddingTop: '10px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                SYNAPSE Homelab Engine
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--color-brand)' }}>
                s/synapse-network
              </span>
            </div>
          </div>

          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              marginBottom: '14px',
            }}
          >
            Nền tảng mạng lưới nơ-ron thảo luận kỹ thuật & DevOps hiệu năng cao. Vận hành 100%
            Self-Hosted trên máy trạm Debian kết nối Cloudflare Zero Trust.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              padding: '10px',
              backgroundColor: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '14px',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                12.4k
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Engineers</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span className="online-pulse" style={{ width: '6px', height: '6px' }} />
                1.8k
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Online now</div>
            </div>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div>
              <strong>Node:</strong> v22 LTS • <strong>Postgres:</strong> 16.15
            </div>
            <div>
              <strong>Redis:</strong> 7.4 • <strong>Container:</strong> Podman 5.4.2
            </div>
          </div>
        </div>
      </div>

      {/* 3. FOOTER LINKS */}
      <footer
        style={{
          padding: '0 8px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: '1.8',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <a
            href="https://github.com/mjjyv/acad_devOps-project"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            GitHub Repository
          </a>
          <span>•</span>
          <a
            href="/api/v1/openapi.yaml"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            OpenAPI 3.1
          </a>
          <span>•</span>
          <span style={{ color: 'var(--text-muted)' }}>RFC 7807</span>
        </div>
        <div>© 2026 SYNAPSE Platform. The Neural Network for Engineers.</div>
      </footer>
    </aside>
  );
}
