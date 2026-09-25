'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  title: string;
  href: string;
  badge?: string;
  badgeColor?: string;
}

interface SidebarGroup {
  groupTitle: string;
  items: SidebarItem[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    groupTitle: 'BẮT ĐẦU',
    items: [
      { title: 'Tổng quan Hệ thống', href: '/docs' },
      { title: 'Checklist 7 Giai đoạn', href: '/docs/checklist', badge: '7 Stages', badgeColor: '#38bdf8' },
    ],
  },
  {
    groupTitle: '1. KHẢO SÁT & PRD',
    items: [
      {
        title: 'Hồ sơ Yêu cầu PRD & Personas',
        href: '/docs/discovery/prd-discovery',
        badge: 'GĐ 1',
        badgeColor: '#10b981',
      },
    ],
  },
  {
    groupTitle: '2. AN NINH & ĐỊNH DANH',
    items: [
      {
        title: 'An ninh, RBAC/ABAC & Token Rotation',
        href: '/docs/security/auth-security',
        badge: 'GĐ 1 & 4',
        badgeColor: '#10b981',
      },
    ],
  },
  {
    groupTitle: '3. THIẾT KẾ & KIẾN TRÚC',
    items: [
      {
        title: 'CSDL PostgreSQL 16 & Redis Lua',
        href: '/docs/architecture/architecture-design',
        badge: 'GĐ 2',
        badgeColor: '#10b981',
      },
    ],
  },
  {
    groupTitle: '4. VẬN HÀNH DEVOPS & CLOUD',
    items: [
      {
        title: 'Cẩm nang Docker, CI/CD & Render',
        href: '/docs/devops/devops-guide',
        badge: 'GĐ 3',
        badgeColor: '#10b981',
      },
    ],
  },
  {
    groupTitle: '5. KẾ HOẠCH & NGHIỆM THU',
    items: [
      {
        title: 'Biên niên sử & Báo cáo Nghiệm thu',
        href: '/docs/plans/plans-history',
        badge: 'GĐ 1-4',
        badgeColor: '#a855f7',
      },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: '260px',
        flexShrink: 0,
        height: 'calc(100vh - 60px)',
        position: 'sticky',
        top: '60px',
        overflowY: 'auto',
        backgroundColor: '#0f172a',
        borderRight: '1px solid #1e293b',
        padding: '1.5rem 1rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {SIDEBAR_GROUPS.map((group, idx) => (
          <div key={idx}>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#64748b',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
                paddingLeft: '0.5rem',
              }}
            >
              {group.groupTitle}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#38bdf8' : '#cbd5e1',
                      backgroundColor: isActive ? '#1e293b' : 'transparent',
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </span>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          backgroundColor: '#1e3a5f',
                          color: item.badgeColor || '#38bdf8',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
