'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || 'Login failed');
      return;
    }
    router.replace(next);
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm">
      <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
      <p className="text-sm text-muted mb-5">Enter the password to continue.</p>
      <label className="label">Password</label>
      <input
        type="password"
        autoFocus
        className="input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {err && <p className="text-sm text-danger mt-2">{err}</p>}
      <button className="btn-primary mt-4 w-full" disabled={busy || !password}>
        {busy ? 'Checking...' : 'Log in'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={<div className="card w-full max-w-sm text-sm text-muted">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
