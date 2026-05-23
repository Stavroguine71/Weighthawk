import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionValue, SESSION_COOKIE_NAME } from './lib/auth';

// Routes that don't need a valid session
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout', '/favicon.ico'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const ok = await verifySessionValue(cookie);
  if (ok) return NextResponse.next();

  // For API requests, return 401 JSON; for pages, redirect to /login
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
