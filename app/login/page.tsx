// app/login/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data?.error || 'Xatolik')
        setLoading(false)
        return
      }
      // cookie is set by the API; redirect to the wheel
      router.push('/')
      router.refresh()
    } catch (err) {
      setError('Server bilan aloqa xatosi')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold mb-1">Kirish</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Hisobingizga kiring yoki{' '}
          <Link href="/register" className="text-sky-400 hover:underline">
            ro‘yxatdan o‘ting
          </Link>
          .
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-zinc-300">Foydalanuvchi nomi</label>
            <input
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-300">Parol</label>
            <input
              type="password"
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
              {error === 'INVALID' ? 'Login yoki parol noto‘g‘ri' : error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 px-4 py-2 font-medium"
          >
            {loading ? 'Kirilmoqda…' : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  )
}