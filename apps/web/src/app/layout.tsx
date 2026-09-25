import type { ReactNode } from 'react';
import { Providers } from './providers.js';

export const metadata = {
  title: 'Acad Community Platform',
  description: 'Nền tảng Mạng xã hội & Diễn đàn cộng đồng hiện đại',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
