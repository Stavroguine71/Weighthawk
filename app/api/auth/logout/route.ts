import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  const c = clearSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: c.name,
    value: c.value,
    maxAge: c.maxAge,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}
