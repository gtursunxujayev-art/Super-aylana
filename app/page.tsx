// app/page.tsx
'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useState } from 'react'

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text().catch(() => r.statusText))
    return r.json()
  })

export default function Home() {
  // Who am I?
  const { data: me, error: meErr, isLoading: meLoading } = useSWR('/api/me', async (u) => {
    const r = await fetch(u)
    if (r.status === 401) return { ok: false, user: null }
    return r.json()
  })

  // Wheel labels
  const [tier, setTier] = useState<50 | 100 | 200>(50)
  const { data: wheel } = useSWR<{ ok: boolean; labels: string[] }>(
    `/api/wheel?tier=${tier}`,
    fetcher,
    { fallbackData: { ok: true, labels: [] } }
  )

  // Global spin state (defensive: route always returns stable shape)
  const { data: state } = useSWR<{
    ok: boolean
    spinning: boolean
    byUserId: string | null
    userName: string
    resultTitle: string
    tier: number | null
    spinStartAt: string | null
    durationMs: number | null
    updatedAt: string | null
    lastWin: { id: string; username: string; title: string; createdAt: string } | null
  }>('/api/state', fetcher, { fallbackData: { ok: true, spinning: false, byUserId: null, userName: '', resultTitle: '', tier: null, spinStartAt: null, durationMs: null, updatedAt: null, lastWin: null } })

  // Store items (don’t crash if empty)
  const { data: store } = useSWR<{ ok: boolean; items: Array<{ id: string; title: string; coinCost: number }> }>(
    '/api/store',
    fetcher,
    { fallbackData: { ok: true, items: [] } }
  )

  // Not logged in → show gate instead of rendering nothing
  if (!meLoading && (!me || !me.ok || !me.user)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold">Kirish talab qilinadi</h1>
          <p className="text-sm opacity-80">Davom etish uchun login yoki ro‘yxatdan o‘ting.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/login" className="px-4 py-2 rounded-lg bg-white text-black font-medium">Login</Link>
            <Link href="/register" className="px-4 py-2 rounded-lg border border-white/20">Register</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-10">
      {/* Tiers */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {[50, 100, 200].map((t) => (
          <button
            key={t}
            onClick={() => setTier(t as 50 | 100 | 200)}
            className={`px-3 py-1.5 rounded-md text-sm border ${tier === t ? 'bg-white text-black' : 'border-white/20'}`}
          >
            {t} tanga
          </button>
        ))}
      </div>

      {/* Wheel placeholder — won’t crash if labels empty */}
      <div className="flex flex-col items-center">
        <div className="text-sm opacity-80 mb-2">Aylantirishga tayyormisiz?</div>
        <div
          className="relative rounded-full"
          style={{
            width: 300,
            height: 300,
            background: 'radial-gradient(circle at 50% 50%, #ffffff 0 60%, rgba(255,255,255,0.9) 60% 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,.12) inset, 0 10px 30px rgba(0,0,0,.35)',
          }}
        >
          {/* Simple labels around – safe if empty */}
          <div className="absolute inset-0 grid place-items-center text-black text-xs">
            {wheel?.labels?.length ? (
              <div className="w-[85%] text-center leading-4">
                {wheel.labels.join(' • ')}
              </div>
            ) : (
              <div className="text-gray-800">Sovg‘alar yo‘q</div>
            )}
          </div>
          {/* pointer */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-[14px] border-l-transparent border-r-transparent border-b-red-500" />
        </div>

        <div className="mt-3 text-sm opacity-80">
          Foydalanuvchi: <span className="font-medium">{me?.user?.username ?? '—'}</span>
        </div>

        <button
          disabled={state?.spinning}
          onClick={async () => {
            try {
              const r = await fetch('/api/spin', { method: 'POST', body: JSON.stringify({ tier }) })
              if (!r.ok) throw new Error(await r.text())
              // SWR will revalidate automatically on focus; you can mutate here if you like
            } catch (e) {
              console.error(e)
              alert('Spinni boshlashda xatolik!')
            }
          }}
          className="mt-2 px-4 py-2 rounded-md border border-white/20 hover:border-white/40 disabled:opacity-50"
        >
          Spin (-{tier})
        </button>
      </div>

      {/* Store (defensive: empty renders fine) */}
      <div className="max-w-6xl mx-auto mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        {store?.items?.map((it) => (
          <div key={it.id} className="rounded-xl overflow-hidden border border-white/10 p-3">
            <div className="text-sm font-medium">{it.title}</div>
            <div className="text-xs opacity-70">{it.coinCost} tanga</div>
            <button
              className="mt-2 text-xs px-3 py-1 rounded-md border border-white/20 hover:border-white/40"
              onClick={() => alert('Soon: sotib olish')}
            >
              Sotib olish
            </button>
          </div>
        ))}
        {!store?.items?.length && (
          <div className="col-span-full text-center opacity-70 text-sm py-6">
            Do‘konda hozircha mahsulot yo‘q
          </div>
        )}
      </div>
    </div>
  )
}
