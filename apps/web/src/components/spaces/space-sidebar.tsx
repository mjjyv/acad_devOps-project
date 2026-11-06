import type { Space, SpaceFlair } from '@acad/contracts';

interface SpaceSidebarProps {
  space: Space;
  flairs: SpaceFlair[];
  selectedFlairId?: string;
  onSelectFlair?: (flairId: string | undefined) => void;
}

export function SpaceSidebar({ space, flairs, selectedFlairId, onSelectFlair }: SpaceSidebarProps) {
  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '316px',
        flexShrink: 0,
      }}
    >
      {/* 1. Giới thiệu Không Gian */}
      <div
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          padding: '16px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            marginBottom: '10px',
          }}
        >
          Thông Tin Không Gian
        </div>
        <p
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            margin: '0 0 14px 0',
          }}
        >
          {space.description || 'Không gian thảo luận kỹ thuật dành cho cộng đồng SYNAPSE.'}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            padding: '12px 0',
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '14px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {space.membersCount?.toLocaleString() || 1}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Thành viên</div>
          </div>
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span className="online-pulse" style={{ width: '6px', height: '6px' }} />
              Online
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trực tuyến</div>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Khởi tạo: {new Date(space.createdAt).toLocaleDateString('vi-VN')}
        </div>
      </div>

      {/* 2. Danh mục Post Flairs (Nhãn chủ đề) */}
      {flairs.length > 0 && (
        <div
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            padding: '16px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}
          >
            Lọc Theo Nhãn (Flairs)
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onSelectFlair?.(undefined)}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '9999px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: !selectedFlairId ? 'var(--color-brand)' : 'var(--bg-subtle)',
                color: !selectedFlairId ? '#090a0f' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Tất cả
            </button>
            {flairs.map((flair) => {
              const isSelected = selectedFlairId === flair.id;
              return (
                <button
                  key={flair.id}
                  type="button"
                  onClick={() => onSelectFlair?.(flair.id)}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: isSelected
                      ? flair.colorHex || 'var(--color-brand)'
                      : flair.backgroundHex || 'var(--bg-subtle)',
                    color: isSelected ? '#090a0f' : 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {flair.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Nội quy Không Gian */}
      {space.rules && space.rules.length > 0 && (
        <div
          style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            padding: '16px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}
          >
            Nội Quy s/{space.slug}
          </div>

          <ol
            style={{
              paddingLeft: '18px',
              margin: 0,
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            {space.rules.map((rule) => (
              <li key={rule.title} style={{ marginBottom: '8px', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{rule.title}</strong>
                {rule.description && (
                  <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '11px' }}>
                    {rule.description}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
}
