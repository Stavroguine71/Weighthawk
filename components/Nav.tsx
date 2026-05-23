'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const items = [
  { href: '/', label: 'Today' },
  { href: '/weighings', label: 'Weight' },
  { href: '/food', label: 'Food log' },
  { href: '/favorites', label: 'Favorites' },
  { href: '/settings', label: 'Settings' },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') return null;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header className="border-b border-white/5 bg-panel/50 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          <span className="text-accent">●</span> Nutrition
        </Link>
        <nav className="flex items-center gap-1">
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  active ? 'bg-panel2 text-white' : 'text-muted hover:text-white hover:bg-panel2/60'
                }`}
              >
                {it.label}
              </Link>
            );
          })}
          <button onClick={logout} className="ml-2 text-xs text-muted hover:text-white">
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
