import React, { useCallback, useEffect, useState } from 'react';

export function AdminAccess({ children }: { children: (logout: () => Promise<void>) => React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'signed-out' | 'signed-in'>('checking');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/session', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const session = await response.json();
      setStatus(session.authenticated ? 'signed-in' : 'signed-out');
    } catch {
      setStatus('signed-out');
      setError('Sign-in is unavailable. Please try again shortly.');
    }
  }, []);

  useEffect(() => {
    void checkSession();
    const timer = window.setInterval(checkSession, 30_000);
    window.addEventListener('focus', checkSession);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', checkSession);
    };
  }, [checkSession]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      });
      if (response.status === 429) throw new Error('Too many sign-in attempts. Please wait a few minutes and try again.');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
      await checkSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!response.ok) throw new Error();
      window.location.assign('/');
    } catch {
      setStatus('signed-out');
      setError('Sign-out could not be confirmed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'checking') return <main className="min-h-screen grid place-items-center" role="status">Checking sign-in…</main>;
  if (status === 'signed-in') return <>{children(logout)}</>;

  return (
    <main className="min-h-screen bg-[#141414] text-white flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-white/60 mb-4">Exceptional Real Estate</p>
        <h1 className="font-cormorant text-4xl mb-3">Admin sign-in</h1>
        <p className="text-sm text-white/70 mb-8">Sign in to manage your website.</p>
        <form onSubmit={login} className="space-y-5">
          <div>
            <label htmlFor="admin-username" className="block text-sm mb-2">Username</label>
            <input id="admin-username" name="username" autoComplete="username" required maxLength={200} className="zenu-input w-full" />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm mb-2">Password</label>
            <input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={1000} className="zenu-input w-full" />
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="w-full h-11 bg-white text-black text-sm font-medium disabled:opacity-50 cursor-pointer">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        {error.startsWith('Sign-out') && <button onClick={logout} disabled={busy} className="mt-5 text-sm underline">Try signing out again</button>}
        <a href="/" className="inline-block mt-8 text-sm text-white/65 hover:text-white">← Back to website</a>
      </div>
    </main>
  );
}
