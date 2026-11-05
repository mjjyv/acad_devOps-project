import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Acad DevOps Discussion Platform v2.0',
  description: 'High-throughput Discussion Engine & Social Architecture Monorepo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
