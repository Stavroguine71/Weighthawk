import { NextResponse } from 'next/server';
import { checkPassword, createSessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '');
  if (!checkPassword(password)) {
    return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 });
  }
  const cookie = await createSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: cookie.name,
    value: cookie.value,
    maxAge: cookie.maxAge,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}
