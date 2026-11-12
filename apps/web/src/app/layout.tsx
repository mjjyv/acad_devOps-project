import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthModal } from '@/components/auth/auth-modal';
import { AuthProvider } from '@/lib/auth/auth-context';
import { ChatProvider } from '@/lib/chat/chat-context';
import { UIProvider } from '@/lib/store/ui-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'SYNAPSE — Diễn đàn Học thuật & DevOps',
  description: 'Nền tảng thảo luận kỹ thuật, chia sẻ kiến thức và không gian học thuật mở.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" data-theme="dark" suppressHydrationWarning>
      <body>
        <UIProvider>
          <AuthProvider>
            <ChatProvider>
              {children}
              <AuthModal />
            </ChatProvider>
          </AuthProvider>
        </UIProvider>
      </body>
    </html>
  );
}
