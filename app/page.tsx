'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import Wheel from './components/Wheel'

type StateRes = {
  state: { status: 'IDLE' | 'SPINNING'; userName?: string | null; tier?: number | null; resultTitle?: string | null }
  users: { id: string; username: string; balance: number }[]
  store: { id: string; title: string; coinCost: number; imageUrl?: string | null }[]
  lastWins: { user: string; title: string; imageUrl?: string | null }[]
}
type MeRes = { ok: boolean; me?: { id: string; username: string; balance: number } }

async function api<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}
const post = <T,>(url: string, body: any) => api<T>(url, { method: 'POST', body: JSON.stringify(body) })

export default function Page() {
  const { data: state, mutate: refState } = useSWR<StateRes>('/api/state', (u) => api<StateRes>(u), { refreshInterval: 3000 })
  const { data: wins, mutate: refWins } = useSWR<any[]>('/api/wins?take=5', (u) => api<any[]>(u), { refreshInterval: 4000 })
  const { data: meRes, mutate: refMe } = useSWR<MeRes>('/api/me', (u) => api<MeRes>(u), { refreshInterval: 4000 })
  const me = meRes?.me

  const [tier, setTier] = useState<50 | 100 | 200>(50)
  const [spinning, setSpinning] = useState(false)

  // real labels for the wheel
  const { data: wheelData, mutate: refWheel } = useSWR<{ ok: boolean; labels: string[] }>(
    `/api/wheel?tier=${tier}`,
    (u) => api(u),
    { refreshInterval: 0 }
  )

  // bootstrap user
  useEffect(() => {
    ;(async () => {
      try {
        const w = window as any
        const tg = w?.Telegram?.WebApp
        if (tg?.initDataUnsafe?.user) {
          const u = tg.initDataUnsafe.user
          await post('/api/bootstrap', { tgId: String(u.id), username: u.username || `${u.first_name || 'User'} ${u.last_name || ''}`.trim() })
        } else {
          const id = localStorage.getItem('demoUid') || String(Math.floor(Math.random() * 1e12))
          localStorage.setItem('demoUid', id)
          const name = localStorage.getItem('demoName') || `Guest${String(id).slice(-4)}`
          localStorage.setItem('demoName', name)
          await post('/api/bootstrap', { tgId: id, username: name })
        }
        refState(); refMe(); refWheel()
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allowGrant = process.env.NEXT_PUBLIC_ALLOW_SELF_GRANT === 'true'
  async function grant(n = 50) { try { await post('/api/dev/grant', { coins: n }); await Promise.all([refMe(), refState()]) } catch {} }

  const slices = useMemo(() => {
    const labs = wheelData?.labels ?? []
    const pad = Array.from({ length: Math.max(0, 12 - labs.length) }, () => 'Prize')
    return [...labs, ...pad].slice(0, 12).map((s) => ({ label: s }))
  }, [wheelData])

  async function doSpin() {
    setSpinning(true)
    try {
      const res = await post<{ ok: true; durationMs: number; result: { title: string; coinDelta: number } }>('/api/spin', { tier: String(tier) })
      setTimeout(async () => {
        await Promise.all([refState(), refWins(), refMe(), refWheel()])
        setSpinning(false)
        alert(`"${me?.username || 'Foydalanuvchi'}", siz "${res.result.title}" yutib oldingiz 🎉`)
      }, res.durationMs)
    } catch (e: any) {
      setSpinning(false)
      const msg = String(e?.message || e)
      if (msg.includes('BUSY')) alert('Hozir aylanyapti, kuting.')
      else if (msg.includes('NOT_ENOUGH_COINS')) alert('Tangalar yetarli emas.')
      else alert('Xatolik.')
    }
  }

  async function buy(prizeId: string, title: string, cost: number) {
    try {
      const res = await post<{ ok: boolean; title: string; cost: number }>('/api/store/buy', { prizeId })
      alert(`"${me?.username || 'Foydalanuvchi'}", siz do‘kondan "${res.title}" ni ${cost} tangaga oldingiz 🎉`)
      await Promise.all([refMe(), refState(), refWins()])
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (msg.includes('NOT_ENOUGH_COINS')) alert('Tangalar yetarli emas.')
      else alert('Sotib olishda xatolik.')
    }
  }

  const busy = state?.state.status === 'SPINNING' || spinning

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 16, paddingTop: 50 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 16 }}>
        {/* LEFT: Terms + last wins */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ ...card, textAlign: 'left' }}>
            <div style={title}>Qoidalar (tanga olish)</div>
            <ul style={{ margin: '6px 0 0 18px', color: '#cbd5e1', fontSize: 14, lineHeight: '22px' }}>
              <li>Onlayn 300.000 so‘m = 10 tanga</li>
              <li>Oflayn 1.000.000 so‘m = 10 tanga</li>
            </ul>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>Admin bu ro‘yxatni keyin kengaytirishi mumkin.</div>
          </div>

          <div style={{ ...card, textAlign: 'left' }}>
            <div style={title}>Oxirgi 5 yutuq</div>
            {!wins?.length && <div style={{ color: '#94a3b8', fontSize: 14 }}>Hali yutuqlar ro‘yxati yo‘q.</div>}
            <ul style={{ marginTop: 6, display: 'grid', gap: 6 }}>
              {wins?.map((w, i) => (
                <li key={i} style={{ fontSize: 14 }}>
                  <span style={badge}>{w.user}</span> {w.title}
                </li>
              ))}
            </ul>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Ro‘yxat har 4 soniyada yangilanadi.</div>
          </div>
        </div>

        {/* CENTER: Wheel + controls */}
        <div style={{ textAlign: 'center', display: 'grid', gap: 12 }}>
          <div>
            {[50, 100, 200].map((v) => (
              <button
                key={v}
                onClick={() => { setTier(v as any); refWheel() }}
                disabled={busy}
                style={{ ...btn, marginRight: 8, opacity: tier === v ? 1 : 0.85 }}
              >
                {v} tanga
              </button>
            ))}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 14 }}>
            {state?.state.status === 'SPINNING' ? 'Keyingi o‘yinchi tayyor!' : 'Aylantirishga tayyormisiz?'}
          </div>

          <Wheel slices={slices} spinning={busy} durationMs={4200} />

          <div style={{ fontSize: 14 }}>
            <span>Foydalanuvchi:</span>
            <b style={{ marginLeft: 6 }}>{me?.username || '...'}</b>
            <span style={{ marginLeft: 16 }}>Balans:</span>
            <b style={{ marginLeft: 4 }}>{me?.balance ?? '...'}</b>
          </div>

          <button onClick={doSpin} disabled={busy} style={{ ...btn, width: 140, margin: '0 auto' }}>
            Spin (-{tier})
          </button>

          {allowGrant && (
            <div style={card}>
              <div style={title}>Demo: Coins</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button style={btn} onClick={() => grant(50)}>+50</button>
                <button style={btn} onClick={() => grant(100)}>+100</button>
                <button style={btn} onClick={() => grant(200)}>+200</button>
              </div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                Panel faqat <code>NEXT_PUBLIC_ALLOW_SELF_GRANT=true</code> bo‘lganda ko‘rinadi.
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: users + store */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ ...card, textAlign: 'left' }}>
            <div style={title}>Ishtirokchilar balansi</div>
            <ul style={{ marginTop: 6 }}>
              {state?.users?.map((u) => (
                <li key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, borderBottom: '1px solid #0f172a' }}>
                  <span style={{ color: '#cbd5e1' }}>{u.username}</span>
                  <b>{u.balance}</b>
                </li>
              ))}
            </ul>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Ro‘yxat har 3 soniyada yangilanadi.</div>
          </div>

          <div style={{ ...card, textAlign: 'left' }}>
            <div style={title}>Do‘kon (sotib olish)</div>
            {state?.store?.length ? (
              <ul style={{ display: 'grid', gap: 8 }}>
                {state.store.map((s) => {
                  const canBuy = (me?.balance ?? 0) >= s.coinCost && !busy
                  return (
                    <li key={s.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto auto', alignItems: 'center', gap: 8 }}>
                      {s.imageUrl ? (
                        <img src={s.imageUrl} width={24} height={24} style={{ borderRadius: 6 }} />
                      ) : (
                        <span style={{ width: 24, height: 24, borderRadius: 6, background: '#334155', display: 'inline-block' }} />
                      )}
                      <span>{s.title}</span>
                      <span style={{ ...badge }}>{s.coinCost} tanga</span>
                      <button
                        style={{ ...btn, opacity: canBuy ? 1 : 0.6 }}
                        disabled={!canBuy}
                        onClick={() => buy(s.id, s.title, s.coinCost)}
                      >
                        Sotib olish
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div style={{ color: '#94a3b8' }}>Hali do‘konda mahsulot yo‘q.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* consistent card/border styles + left alignment everywhere */
const card: React.CSSProperties = {
  background: '#0b1220',
  border: '1px solid #142035',
  borderRadius: 12,
  padding: 14,
}
const title: React.CSSProperties = { fontWeight: 600, marginBottom: 6 }
const btn: React.CSSProperties = {
  background: '#1f2937',
  border: '1px solid #374151',
  color: '#e5e7eb',
  borderRadius: 10,
  padding: '10px 14px',
  cursor: 'pointer',
}
const badge: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #334155',
  borderRadius: 999,
  fontSize: 12,
  color: '#e5e7eb',
}
