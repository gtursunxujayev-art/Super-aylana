// app/page.tsx
'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(path: 'login' | 'register') {
    setErr(null); setBusy(true)
    try {
      const r = await fetch(`/api/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const j = await r.json()
      if (!r.ok || !j.ok) throw new Error(j.error || 'Server xatosi')
      // cookie is set by the API; just navigate
      window.location.href = '/wheel'
    } catch (e: any) {
      setErr(e.message || 'Server bilan aloqa xatosi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-start sm:items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-2">Kirish</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Hisobingizga kiring yoki ro‘yxatdan o‘ting.
        </p>

        <label className="block text-sm mb-1">Foydalanuvchi nomi</label>
        <input
          className="w-full mb-4 rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 outline-none"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <label className="block text-sm mb-1">Parol</label>
        <input
          type="password"
          className="w-full mb-6 rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 outline-none"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {err && <p className="text-red-400 text-sm mb-4">{err}</p>}

        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => submit('login')}
            className="flex-1 rounded-md bg-white/10 hover:bg-white/20 py-2"
          >
            Kirish
          </button>
          <button
            disabled={busy}
            onClick={() => submit('register')}
            className="flex-1 rounded-md bg-indigo-600 hover:bg-indigo-500 py-2"
          >
            Ro‘yxatdan o‘tish
          </button>
        </div>
      </div>
    </main>
  )
}