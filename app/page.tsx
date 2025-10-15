// app/page.tsx
'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useRef, useState } from 'react'
import Wheel from '@/components/Wheel'
import WinModal from '@/components/WinModal'

type Me = { ok:boolean; user?: { id:string; username:string; balance:number } }
type State = { ok:boolean; spinning:boolean; byUserId:string|null; lastWin: { id:string; username:string; title:string; imageUrl?:string|null; at:string } | null }
type Store = { ok:boolean; items: { id:string; title:string; coinCost:number; imageUrl?:string|null }[] }

const api = async <T,>(u:string, init?:RequestInit) => {
  const r = await fetch(u, init); if(!r.ok) throw new Error(await r.text()); return await r.json() as T
}

export default function Home() {
  // who am i
  const { data: meData, mutate: mutateMe } = useSWR<Me>('/api/me', api)
  const me = meData?.user

  // store items (small cards)
  const { data: store } = useSWR<Store>('/api/store', api, { refreshInterval: 10000 })

  // global spin state (locks + wins)
  const { data: st, mutate: mutateState } = useSWR<State>('/api/state', api, { refreshInterval: 2000 })

  // wheel tier
  const [tier, setTier] = useState<50|100|200>(50)

  // wheel labels (server decides exactly what can land; for UI we just show a subset/preview)
  const wheelLabels = useMemo(()=>['Mehmon','Yangi','Another spin','+75 coins','Yandj','...'],[tier])

  // spin animation
  const [spinning, setSpinning] = useState(false)
  const [angle, setAngle] = useState(0)

  // popup
  const [modal, setModal] = useState<{ open:boolean; user?:string; title?:string; img?:string|null }>({ open:false })

  // show modal when LAST win changes (any user)
  const lastWinId = useRef<string|undefined>(undefined)
  useEffect(()=>{
    if (!st?.lastWin) return
    if (st.lastWin.id !== lastWinId.current) {
      lastWinId.current = st.lastWin.id
      setModal({ open:true, user: st.lastWin.username, title: st.lastWin.title, img: st.lastWin.imageUrl || null })
    }
  }, [st?.lastWin])

  async function spin() {
    if (!me) return alert('Avval kirish kerak')
    if (st?.spinning && st.byUserId !== me.id) return
    try {
      setSpinning(true)
      setAngle(a => a + 1440 + Math.floor(Math.random()*360))
      const res = await api<{ ok:boolean; win:{ title:string } }>('/api/spin', {
        method:'POST',
        headers:{ 'content-type':'application/json' },
        body: JSON.stringify({ tier })
      })
      // state polling will open the popup for everyone
      await mutateState()
      await mutateMe()
    } catch (e:any) {
      alert(e?.message || 'Xatolik')
    } finally {
      setTimeout(()=>setSpinning(false), 3300)
    }
  }

  const disabled = st?.spinning && st.byUserId !== me?.id

  // layout tokens
  const card:React.CSSProperties={ border:'1px solid #1f2937', background:'#0b1220', borderRadius:12, padding:12 }
  const btn:React.CSSProperties={ padding:'10px 14px', borderRadius:12, border:'1px solid #374151', background:'#111827', color:'#e5e7eb', cursor:'pointer' }
  const muted:React.CSSProperties={ color:'#9ca3af' }

  return (
    <div style={{ paddingTop: 50, paddingBottom: 24 }}>
      {/* mobile-first: price buttons + wheel */}
      <div style={{ display:'grid', placeItems:'center', gap:10 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
          {[50,100,200].map(v=>(
            <button key={v} style={{ ...btn, opacity: tier===v?1:.86 }} onClick={()=>setTier(v as 50|100|200)}>
              {v} tanga
            </button>
          ))}
        </div>

        <h3 style={{ margin:'6px 0 4px' }}>Aylantirishga tayyormisiz?</h3>
        <Wheel labels={wheelLabels} spinning={spinning} angle={angle} />

        <div style={{ marginTop:8, ...muted }}>
          Foydalanuvchi: <b>{me?.username || '—'}</b> &nbsp; Balans: <b>{me?.balance ?? 0}</b>
        </div>

        <button disabled={disabled || spinning} onClick={spin}
                style={{ ...btn, marginTop:6, opacity: (disabled||spinning)?0.6:1 }}>
          Spin (-{tier})
        </button>
      </div>

      {/* lists below on mobile; on desktop place side-by-side via CSS grid if you prefer */}

      {/* Store block: compact cards */}
      <div style={{ maxWidth: 1000, margin:'20px auto', padding:'0 14px' }}>
        <div style={{ ...card }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
            {store?.items?.map(it=>(
              <div key={it.id} style={{ border:'1px solid #1f2937', borderRadius:10, overflow:'hidden' }}>
                <div style={{ width:'100%', aspectRatio:'1/1', background:'#111827' }}>
                  {it.imageUrl ? <img src={it.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : null}
                </div>
                <div style={{ padding:8, fontSize:13 }}>
                  <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.title}</div>
                  <div style={{ opacity:.7 }}>{it.coinCost} tanga</div>
                  <button style={{ ...btn, width:'100%', marginTop:6 }}>Sotib olish</button>
                </div>
              </div>
            )) || <div style={{ opacity:.7 }}>Hozircha do‘konda sovg‘alar yo‘q.</div>}
          </div>
        </div>
      </div>

      {/* WIN MODAL for everyone */}
      <WinModal
        open={modal.open}
        onClose={()=>setModal(m=>({ ...m, open:false }))}
        username={modal.user}
        title={modal.title}
        imageUrl={modal.img || undefined}
      />
    </div>
  )
}
