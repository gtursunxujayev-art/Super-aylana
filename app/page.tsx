'use client';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function HomePage() {
  const { data, isLoading } = useSWR('/api/auth/me', fetcher);

  if (isLoading) return <div className="p-6">Yuklanmoqda...</div>;

  const user = data?.user;

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h1 className="text-2xl font-semibold mb-2">Kirish talab qilinadi</h1>
          <p className="text-zinc-400 mb-6">
            Davom etish uchun <Link className="underline" href="/login">login</Link> yoki{' '}
            <Link className="underline" href="/register">ro‘yxatdan o‘ting</Link>.
          </p>
        </div>
      </div>
    );
  }

  // ✅ Authenticated: render your wheel page (kept simple)
  return (
    <div className="p-4 pt-[50px] max-w-4xl mx-auto">
      <div className="flex gap-2 justify-center mb-4">
        <button className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700">50 tanga</button>
        <button className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700">100 tanga</button>
        <button className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700">200 tanga</button>
      </div>

      {/* Your wheel component goes here (white style, pointer at top).
         Keep your existing wheel component import if you already have one.
         This is just a placeholder area to show access works. */}
      <div className="mx-auto my-6 aspect-square w-[280px] sm:w-[360px] rounded-full bg-white text-black flex items-center justify-center">
        G‘ildirak
      </div>

      <div className="text-center text-sm text-zinc-400">
        Foydalanuvchi: <span className="font-medium">{user.username}</span> — Balans: <span className="font-medium">{user.balance}</span>
      </div>
    </div>
  );
}
