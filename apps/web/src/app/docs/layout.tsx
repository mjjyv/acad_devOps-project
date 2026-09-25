import React from 'react';
import { DocsHeader } from '../../components/docs/docs-header.js';
import { DocsSidebar } from '../../components/docs/docs-sidebar.js';

export const metadata = {
  title: 'Acad Community Docs - Cổng Tài Liệu Kỹ Thuật Dự Án',
  description: 'Đặc tả kiến trúc, PRD, An ninh RBAC/ABAC, PostgreSQL 16 ltree, Docker và Checklist 7 Giai đoạn',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0f17', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <DocsHeader />
      <div style={{ display: 'flex', flex: 1, width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
        <DocsSidebar />
        <div style={{ flex: 1, minWidth: 0, paddingBottom: '4rem' }}>{children}</div>
      </div>
    </div>
  );
}
