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
      { title: 'Checklist 7 Giai đoạn', href: '/docs/checklist', badge: '7 Stages' },
    ],
  },
  {
    groupTitle: '1. KHẢO SÁT & PRD',
    items: [
      {
        title: 'Hồ sơ Yêu cầu PRD & Personas',
        href: '/docs/discovery/prd-discovery',
        badge: 'GĐ 1',
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
      },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: '270px',
        flexShrink: 0,
        height: 'calc(100vh - 60px)',
        position: 'sticky',
        top: '60px',
        overflowY: 'auto',
        backgroundColor: '#222831',
        borderRight: '2px solid #948979',
        padding: '1.5rem 1rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {SIDEBAR_GROUPS.map((group, idx) => (
          <div key={idx}>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: '#948979',
                letterSpacing: '0.08em',
                marginBottom: '0.5rem',
                paddingLeft: '0.5rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              // {group.groupTitle}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
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
                      borderRadius: '0px',
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#222831' : '#DFD0B8',
                      backgroundColor: isActive ? '#DFD0B8' : 'transparent',
                      border: isActive ? '1px solid #DFD0B8' : '1px solid transparent',
                      boxShadow: isActive ? '2px 2px 0px #948979' : 'none',
                      transition: 'all 0.1s ease-in-out',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </span>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.35rem',
                          borderRadius: '0px',
                          backgroundColor: isActive ? '#222831' : '#393E46',
                          color: isActive ? '#DFD0B8' : '#948979',
                          border: '1px solid #948979',
                          fontFamily: 'var(--font-mono)',
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
