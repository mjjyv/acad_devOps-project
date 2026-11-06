'use client';

import {
  CardViewIcon,
  CompactViewIcon,
  FireIcon,
  SparklesIcon,
  TrendingUpIcon,
} from '@/components/ui/icons';
import { useUIState } from '@/lib/store/ui-context';

export function FeedHeader() {
  const { activeFeedTab, setActiveFeedTab, feedSort, setFeedSort, viewMode, setViewMode } =
    useUIState();

  const sortOptions = [
    { id: 'hot' as const, label: 'Hot', icon: <FireIcon size={16} /> },
    { id: 'new' as const, label: 'New', icon: <SparklesIcon size={16} /> },
    { id: 'top' as const, label: 'Top', icon: <TrendingUpIcon size={16} /> },
    { id: 'best' as const, label: 'Best', icon: <FireIcon size={16} /> },
  ];

  return (
    <div
      style={{
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Feed Tabs: For You / Following */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 4,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveFeedTab('for_you')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 12px',
              fontSize: 14,
              fontWeight: activeFeedTab === 'for_you' ? 700 : 500,
              color: activeFeedTab === 'for_you' ? 'var(--text-primary)' : 'var(--text-secondary)',
              position: 'relative',
              transition: 'color 0.15s ease',
            }}
          >
            For You
            {activeFeedTab === 'for_you' && (
              <span
                style={{
                  position: 'absolute',
                  bottom: -5,
                  left: 12,
                  right: 12,
                  height: 3,
                  backgroundColor: 'var(--color-brand)',
                  borderRadius: 2,
                }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFeedTab('following')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 12px',
              fontSize: 14,
              fontWeight: activeFeedTab === 'following' ? 700 : 500,
              color:
                activeFeedTab === 'following' ? 'var(--text-primary)' : 'var(--text-secondary)',
              position: 'relative',
              transition: 'color 0.15s ease',
            }}
          >
            Following
            {activeFeedTab === 'following' && (
              <span
                style={{
                  position: 'absolute',
                  bottom: -5,
                  left: 12,
                  right: 12,
                  height: 3,
                  backgroundColor: 'var(--color-brand)',
                  borderRadius: 2,
                }}
              />
            )}
          </button>
        </div>

        {/* View Mode Toggle: Card vs Compact */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-pill)',
            borderRadius: 'var(--radius-full)',
            padding: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('card')}
            title="Card View"
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-full)',
              background: viewMode === 'card' ? 'var(--bg-surface)' : 'transparent',
              color: viewMode === 'card' ? 'var(--text-primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: viewMode === 'card' ? '0 1px 2px rgba(0,0,0,0.4)' : 'none',
            }}
          >
            <CardViewIcon size={15} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('compact')}
            title="Compact View"
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-full)',
              background: viewMode === 'compact' ? 'var(--bg-surface)' : 'transparent',
              color: viewMode === 'compact' ? 'var(--text-primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: viewMode === 'compact' ? '0 1px 2px rgba(0,0,0,0.4)' : 'none',
            }}
          >
            <CompactViewIcon size={15} />
          </button>
        </div>
      </div>

      {/* Sorter Pills Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {sortOptions.map((opt) => {
          const isActive = feedSort === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFeedSort(opt.id)}
              className="reddit-pill-btn"
              style={{
                backgroundColor: isActive ? 'var(--bg-surface-hover)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                border: isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
              }}
            >
              <span style={{ color: isActive ? 'var(--color-brand)' : 'currentColor' }}>
                {opt.icon}
              </span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
