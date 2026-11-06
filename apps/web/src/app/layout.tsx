import type { Metadata } from 'next';
import './globals.css';
import { AuthModal } from '@/components/auth/auth-modal';
import { AuthProvider } from '@/lib/auth/auth-context';
import { UIProvider } from '@/lib/store/ui-context';

export const metadata: Metadata = {
  title: 'SYNAPSE - The Neural Network for Engineers & Architects',
  description:
    'High-throughput distributed discussion engine, systems architecture & DevOps community platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <UIProvider>
            {children}
            <AuthModal />
          </UIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
