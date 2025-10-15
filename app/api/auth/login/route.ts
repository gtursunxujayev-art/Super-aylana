'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Login failed')
      window.location.href = '/'
    } catch (err: any) {
      setError(
        err?.message === 'INVALID' ? 'Login yoki parol xato.' : 'Kutilmagan xatolik.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-lg">
        <h1 className="text-xl font-semibold mb-1">Kirish</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Davom etish uchun hisobingizga kiring.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-300">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="username"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="text-sm text-zinc-300">Parol</label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? 'Kirilmoqda…' : 'Kirish'}
          </button>
        </form>

        <div className="mt-4 text-sm text-zinc-400">
          Hisobingiz yo‘qmi?{' '}
          <Link className="text-blue-400 hover:underline" href="/register">
            Ro‘yxatdan o‘tish
          </Link>
        </div>
      </div>
    </div>
  )
}
