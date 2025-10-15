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
  const { data: state } = useSWR<StateRes>('/api/state', (u) => api<StateRes>(u), { refreshInterval: 3000 })
  const { data: wins } = useSWR<any[]>('/api/wins?take=5', (u) => api<any[]>(u), { refreshInterval: 4000 })
  const { data: meRes, mutate: refMe } = useSWR<MeRes>('/api/me', (u) => api<MeRes>(u))
  const me = meRes?.me

  const [tier, setTier] = useState<50 | 100 | 200>(50)
  const [spinning, setSpinning] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [tgInfo, setTgInfo] = useState<{ temp?: string } | null>(null)

  const { data: wheelData } = useSWR<{ ok: boolean; labels: string[] }>(
    `/api/wheel?tier=${tier}`, (u) => api(u)
  )

  // Telegram-only auto login. No guest fallback.
  useEffect(() => {
    ;(async () => {
      try {
        const w = window as any
        const tg = w?.Telegram?.WebApp
        if (tg?.ready) tg.ready()
        if (tg?.initData && tg.initData.length > 0) {
          const r = await post<{ ok: boolean; user: any; tempPassword?: string }>('/api/bootstrap', { initData: tg.initData })
          if (r?.tempPassword) setTgInfo({ temp: r.tempPassword })
          await refMe()
        }
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const slices = useMemo(() => (wheelData?.labels ?? []).map(label => ({ label })), [wheelData])

  async function doSpin() {
    setSpinning(true)
    try {
      const res = await post<{ ok: true; durationMs: number; result: { title: string; coinDelta: number } }>('/api/spin', { tier: String(tier) })
      setTimeout(async () => { await refMe(); setSpinning(false); alert(`"${me?.username || 'Foydalanuvchi'}", siz "${res.result.title}" yutib oldingiz 🎉`) }, res.durationMs)
    } catch (e: any) {
      setSpinning(false)
      const msg = String(e?.message || e)
      if (msg.includes('BUSY')) alert('Hozir aylanyapti, kuting.')
      else if (msg.includes('NOT_ENOUGH_COINS')) alert('Tangalar yetarli emas.')
      else alert('Xatolik.')
    }
  }

  async function buy(prizeId: string, title: string, cost: number) {
    try { await post('/api/store/buy', { prizeId }); await refMe(); alert(`"${me?.username || 'Foydalanuvchi'}", siz do‘kondan "${title}" ni ${cost} tangaga oldingiz 🎉`) }
    catch (e: any) { const msg = String(e?.message || e); if (msg.includes('NOT_ENOUGH_COINS')) alert('Tangalar yetarli emas.'); else alert('Sotib olishda xatolik.') }
  }

  const busy = state?.state.status === 'SPINNING' || spinning

  // AUTH
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  async function doLogin() {
    try { await post('/api/auth/login', { username, password }); await refMe() }
    catch { alert('Login xato. Parol yoki foydalanuvchi noto‘g‘ri.') }
  }
  async function doRegister() {
    try { await post('/api/auth/register', { username, password }); await refMe(); alert('Ro‘yxatdan o‘tildi. Xush kelibsiz!') }
    catch (e:any) { const msg = String(e?.message || e); if (msg.includes('USERNAME_TAKEN')) alert('Bu foydalanuvchi nomi band.'); else alert('Ro‘yxatdan o‘tishda xatolik.') }
  }

  // Not logged in → Auth screen
  if (!me) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', padding: 16 }}>
        <div style={{ ...card, textAlign:'left' }}>
          <h2 style={{ marginTop:0 }}>Kirish / Ro‘yxatdan o‘tish</h2>
          <div style={{ color:'#94a3b8', fontSize:14, marginBottom:12 }}>
            Telegram ichidan ochsangiz — avtomatik kiriladi. Aks holda bu yerda akkaunt oching yoki kiring.
          </div>

          {tgInfo?.temp && (
            <div style={{ ...card, borderColor:'#14532d', background:'#062012', marginBottom:12 }}>
              <div><b>Telegram orqali kirdingiz.</b></div>
              <div>Saytga keyinchalik kirish uchun vaqtinchalik parolingiz:</div>
              <div style={{ marginTop:8, fontSize:18 }}><code>{tgInfo.temp}</code></div>
            </div>
          )}

          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <button style={{ ...btn, background: mode==='login' ? '#1f2937':'#0f172a' }} onClick={()=>setMode('login')}>Kirish</button>
            <button style={{ ...btn, background: mode==='register' ? '#1f2937':'#0f172a' }} onClick={()=>setMode('register')}>Ro‘yxatdan o‘tish</button>
          </div>

          <div style={{ display:'grid', gap:8 }}>
            <input placeholder="Foydalanuvchi nomi" value={username} onChange={e=>setUsername(e.target.value)} style={input}/>
            <input placeholder="Parol" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={input}/>
            {mode==='login' ? (
              <button style={btn} onClick={doLogin}>Kirish</button>
            ) : (
              <button style={btn} onClick={doRegister}>Ro‘yxatdan o‘tish</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Logged-in UI (fixed 3-column desktop grid)
  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: 16, paddingTop: 20 }}>
      <div className="desktop-grid">
        {/* LEFT */}
        <div className="left-col">
          <div style={{ ...card, textAlign:'left' }}>
            <div style={title}>Qoidalar (tanga olish)</div>
            <ul style={{ margin: '6px 0 0 18px', color: '#cbd5e1', fontSize: 14, lineHeight: '22px' }}>
              <li>Onlayn 300.000 so‘m = 10 tanga</li>
              <li>Oflayn 1.000.000 so‘m = 10 tanga</li>
            </ul>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>Admin bu ro‘yxatni keyin kengaytirishi mumkin.</div>
          </div>
          <div style={{ ...card, textAlign:'left' }}>
            <div style={title}>Oxirgi 5 yutuq</div>
            {!wins?.length && <div style={{ color: '#94a3b8', fontSize: 14 }}>Hali yutuqlar ro‘yxati yo‘q.</div>}
            <ul style={{ marginTop: 6, display: 'grid', gap: 6 }}>
              {state?.lastWins?.map((w, i) => (
                <li key={i} style={{ fontSize: 14 }}>
                  <span style={badge}>{w.user}</span> {w.title}
                </li>
              ))}
            </ul>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Ro‘yxat har 4 soniyada yangilanadi.</div>
          </div>
        </div>

        {/* CENTER */}
        <div className="center-col">
          <div style={{ textAlign: 'center' }}>
            {[50, 100, 200].map((v) => (
              <button key={v} onClick={() => setTier(v as any)} disabled={busy} style={{ ...btn, marginRight: 8, opacity: tier===v ? 1 : 0.85 }}>
                {v} tanga
              </button>
            ))}
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 16, textAlign: 'center', marginTop: 8 }}>
            {state?.state.status === 'SPINNING' ? 'Keyingi o‘yinchi tayyor!' : 'Aylantirishga tayyormisiz?'}
          </div>
          <div style={{ marginTop: 8 }}><Wheel slices={slices} spinning={busy} durationMs={4200} /></div>
          <div style={{ fontSize: 14, textAlign: 'center', marginTop: 10 }}>
            <span>Foydalanuvchi:</span><b style={{ marginLeft: 6 }}>{me?.username}</b>
            <span style={{ marginLeft: 16 }}>Balans:</span><b style={{ marginLeft: 4 }}>{me?.balance ?? 0}</b>
          </div>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button onClick={doSpin} disabled={busy} style={{ ...btn, width: 140 }}>Spin (-{tier})</button>
          </div>

          {/* fixed-width dropdown to avoid widening */}
          <div className="fixed-dropdown" style={{ marginTop: 16 }}>
            <button onClick={() => setShowAll(s => !s)} style={{ ...btn, width:'100%', display:'flex', justifyContent:'space-between' }}>
              <span>Barcha sovg‘alar (narxlari bilan)</span>
              <span style={{ opacity: 0.8 }}>{showAll ? '▲' : '▼'}</span>
            </button>
            {showAll && (
              <div className="dropdown-body" style={{ ...card, marginTop:8 }}>
                {(state?.store?.length ?? 0) === 0 && <div style={{ color: '#94a3b8' }}>Hali sovg‘alar yo‘q.</div>}
                <ul style={{ display:'grid', gap:6 }}>
                  {state?.store?.map((s) => (
                    <li key={s.id} style={{ display:'grid', gridTemplateColumns:'24px minmax(0,1fr) auto', gap:8, alignItems:'center', border:'1px solid #142035', borderRadius:8, padding:'6px 8px' }}>
                      {s.imageUrl ? <img src={s.imageUrl} width={24} height={24} style={{ borderRadius:6 }} /> : <span style={{ width:24, height:24, background:'#334155', borderRadius:6, display:'inline-block' }}/>}
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</span>
                      <span style={badge}>{s.coinCost} tanga</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-col">
          <div style={{ ...card, textAlign:'left' }}>
            <div style={title}>Ishtirokchilar balansi</div>
            <ul style={{ marginTop: 6 }}>
              {state?.users?.map((u) => (
                <li key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, borderBottom: '1px solid #0f172a' }}>
                  <span style={{ color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{u.username}</span>
                  <b>{u.balance}</b>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ ...card, textAlign:'left', overflow:'hidden' }}>
            <div style={title}>Do‘kon (sotib olish)</div>
            {(state?.store?.length ?? 0) === 0 && <div style={{ color:'#94a3b8' }}>Hali do‘konda mahsulot yo‘q.</div>}
            <ul style={{ display:'grid', gap:8 }}>
              {state?.store?.map((s) => {
                const canBuy = (me?.balance ?? 0) >= s.coinCost && !busy
                return (
                  <li key={s.id} style={{ display:'grid', gridTemplateColumns:'24px minmax(0,1fr) auto auto', gap:8, alignItems:'center', border:'1px solid #142035', borderRadius:10, padding:'6px 8px' }}>
                    {s.imageUrl ? <img src={s.imageUrl} width={24} height={24} style={{ borderRadius:6 }} /> : <span style={{ width:24, height:24, background:'#334155', borderRadius:6, display:'inline-block' }}/>}
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</span>
                    <span style={badge}>{s.coinCost} tanga</span>
                    <button style={{ ...btn, width:110 }} disabled={!canBuy} onClick={() => buy(s.id, s.title, s.coinCost)}>Sotib olish</button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/* tokens */
const card: React.CSSProperties = { background: '#0b1220', border: '1px solid #142035', borderRadius: 12, padding: 14 }
const title: React.CSSProperties = { fontWeight: 600, marginBottom: 6, textAlign: 'left' }
const btn: React.CSSProperties = { background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }
const badge: React.CSSProperties = { padding: '4px 8px', border: '1px solid #334155', borderRadius: 999, fontSize: 12, color: '#e5e7eb', whiteSpace: 'nowrap' }
const input: React.CSSProperties = { background:'#111827', border:'1px solid #334155', color:'#e5e7eb', borderRadius:8, padding:'10px 12px' }
