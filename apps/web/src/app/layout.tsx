import type { Metadata } from 'next';
import './globals.css';
import { UIProvider } from '@/lib/store/ui-context';

export const metadata: Metadata = {
  title: 'Acad DevOps Platform - Community & Discussions',
  description:
    'High-throughput modern minimalist Reddit-style discussion engine and social architecture',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UIProvider>{children}</UIProvider>
      </body>
    </html>
  );
}
