'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthShell from '../auth-layout';

export default function RegisterPage() {
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [loading, setL] = useState(false);
  const [error, setE] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setL(true); setE(null);
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: { 'Content-Type': 'application/json' },
    });
    const j = await r.json();
    setL(false);
    if (!r.ok) { setE(j?.error ?? 'Xatolik'); return; }
    // After register, go to login
    window.location.href = '/login';
  }

  return (
    <AuthShell>
      <h1 className="text-xl font-semibold mb-1">Ro‘yxatdan o‘tish</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Oldin ro‘yxatdan o‘tganmisiz? <Link className="underline" href="/login">Kiring</Link>.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-zinc-300">Foydalanuvchi nomi</span>
          <input
            className="mt-1 w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-500"
            value={username} onChange={(e) => setU(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm text-zinc-300">Parol</span>
          <input
            type="password"
            className="mt-1 w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-500"
            value={password} onChange={(e) => setP(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-white/90 text-black font-medium py-2 hover:bg-white disabled:opacity-60"
        >
          {loading ? '...' : 'Ro‘yxatdan o‘tish'}
        </button>
      </form>
    </AuthShell>
  );
}
