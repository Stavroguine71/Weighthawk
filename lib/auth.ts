// Simple cookie-based password protection.
// Single APP_PASSWORD env var. We sign a session token with SESSION_SECRET (HMAC-SHA256, Web Crypto).
// Cookie holds "<expiresAtMs>.<base64url-signature>". On every request, the middleware verifies
// the signature and expiry. No database needed.

const COOKIE_NAME = 'na_session';
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || '';
  if (!secret || secret.length < 16) {
    // Fall back to a derived constant so dev still works, but warn.
    return 'dev-insecure-secret-please-set-SESSION_SECRET';
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function hmac(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(sig);
}

export async function createSessionCookie(): Promise<{ name: string; value: string; maxAge: number }> {
  const expiresAt = Date.now() + TTL_MS;
  const sig = await hmac(String(expiresAt));
  return {
    name: COOKIE_NAME,
    value: `${expiresAt}.${sig}`,
    maxAge: Math.floor(TTL_MS / 1000),
  };
}

export function clearSessionCookie(): { name: string; value: string; maxAge: number } {
  return { name: COOKIE_NAME, value: '', maxAge: 0 };
}

export async function verifySessionValue(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [expStr, sig] = value.split('.');
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await hmac(expStr);
  // constant-time compare
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD || '';
  if (!expected) return false;
  if (input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ input.charCodeAt(i);
  return diff === 0;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
