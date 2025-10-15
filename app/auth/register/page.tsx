'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RegisterPage() {
  const r = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Register failed')
      // Registered and logged in -> go home
      r.push('/')
      r.refresh()
    } catch (err: any) {
      setError(err.message || 'Ro‘yxatdan o‘tishda xato')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Ro‘yxatdan o‘tish</h1>
        <p className="text-sm text-zinc-400 mb-6">Yangi hisob yarating</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-zinc-300">Foydalanuvchi nomi</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none focus:border-zinc-500"
              required
            />
          </div>
          <div>
            <label className="text-sm text-zinc-300">Parol (kamida 4 belgidan)</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none focus:border-zinc-500"
              required
              minLength={4}
            />
          </div>

        <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-white/90 px-4 py-2 font-medium text-black hover:bg-white disabled:opacity-60"
          >
            {loading ? 'Yaratilmoqda…' : 'Ro‘yxatdan o‘tish'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-zinc-400">
          Allaqachon hisobingiz bormi?{' '}
          <a href="/auth/login" className="text-white underline underline-offset-2">
            Kirish
          </a>
        </div>
      </div>
    </div>
  )
}
