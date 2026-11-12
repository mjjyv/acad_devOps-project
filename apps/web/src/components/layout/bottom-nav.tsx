'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChat } from '@/lib/chat/chat-context';
import { ChatBubbleIcon, ExploreIcon, HomeIcon, PlusIcon, PopularIcon } from '../ui/icons';

export function BottomNav() {
  const pathname = usePathname();
  const { unreadTotal } = useChat();

  const itemStyle = (active: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    fontSize: '11px',
    textDecoration: 'none',
    color: active ? 'var(--color-brand)' : 'var(--text-secondary)',
    fontWeight: active ? 700 : 500,
    position: 'relative' as const,
  });

  return (
    <nav className="mobile-bottom-nav" aria-label="Điều hướng di động">
      <Link href="/?tab=following" style={itemStyle(pathname === '/')}>
        <HomeIcon size={18} />
        <span>Home</span>
      </Link>
      <Link href="/?tab=for_you&sort=hot" style={itemStyle(false)}>
        <PopularIcon size={18} />
        <span>Popular</span>
      </Link>
      <Link href="/submit" style={itemStyle(pathname.startsWith('/submit'))}>
        <PlusIcon size={18} />
        <span>Đăng</span>
      </Link>
      <Link href="/explore" style={itemStyle(pathname.startsWith('/explore'))}>
        <ExploreIcon size={18} />
        <span>Explore</span>
      </Link>
      <Link href="/chat" style={itemStyle(pathname.startsWith('/chat'))}>
        <div style={{ position: 'relative' }}>
          <ChatBubbleIcon size={18} />
          {unreadTotal > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-4px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-brand)',
              }}
            />
          )}
        </div>
        <span>Chat</span>
      </Link>
    </nav>
  );
}
