import type { ReactNode } from 'react';
import { FloatingChatWidget } from '../chat/floating-chat-widget';
import { BottomNav } from './bottom-nav';
import { Header } from './header';
import { LeftSidebar } from './left-sidebar';
import { RightRail } from './right-rail';

export function AppShell({
  children,
  hideRightRail = false,
  wide = false,
}: {
  children: ReactNode;
  hideRightRail?: boolean;
  wide?: boolean;
}) {
  return (
    <>
      <Header />
      <div className="app-shell-container">
        <LeftSidebar />
        <main className="app-main-feed">
          <div className={wide ? 'app-main-inner app-main-inner--wide' : 'app-main-inner'}>
            {children}
          </div>
        </main>
        {!hideRightRail && <RightRail />}
      </div>
      <FloatingChatWidget />
      <BottomNav />
    </>
  );
}
