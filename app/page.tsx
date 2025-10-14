'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import Wheel from '@/components/Wheel'
import { api, post } from './lib/api'

type StateRes = {
  state: { status:'IDLE'|'SPINNING', userName?:string|null, tier?:number|null, resultTitle?:string|null }
  users: { id:string; username:string; balance:number }[]
  store: { id:string; title:string; coinCost:number; imageUrl?:string|null }[]
  lastWins: { user:string; title:string; imageUrl?:string|null }[]
}

export default function Page(){
  const { data, mutate, isLoading } = useSWR<StateRes>('/api/state', (url)=>api<StateRes>(url), { refreshInterval: 3000 })
  const { data: wins, mutate: refWins } = useSWR('/api/wins?take=5', (url)=>api<any[]>(url), { refreshInterval: 4000 })
  const [tier, setTier] = useState<50|100|200>(50)
  const [authDone, setAuthDone] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const balance = useMemo(()=>{
    // pick “me” by last username from Telegram (not stored; for demo we show total list anyway)
    return undefined
  },[data])

  // Telegram WebApp bootstrap or local demo
  useEffect(()=>{
    const w = window as any
    const tg = w?.Telegram?.WebApp
    async function boot(){
      if (tg?.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user
        await fetch('/api/bootstrap', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ tgId:String(u.id), username: u.username || `${u.first_name||'User'} ${u.last_name||''}`.trim() }) })
        setAuthDone(true); mutate()
      } else {
        // local demo: one-time create random demo user
        const id = localStorage.getItem('demoUid') || String(Math.floor(Math.random()*1e12))
        localStorage.setItem('demoUid', id)
        const name = localStorage.getItem('demoName') || `Guest${String(id).slice(-4)}`
        localStorage.setItem('demoName', name)
        await fetch('/api/bootstrap', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ tgId:id, username:name }) })
        setAuthDone(true); mutate()
      }
    }
    boot()
  },[mutate])

  const slices = useMemo(()=>{
    // show placeholder labels; actual result comes from backend
    const base = ['Another spin', tier===50?'+75 coins': tier===100?'+150 coins':'+300 coins']
    const rest = Array.from({length:10}, (_,i)=> `Prize ${i+1}`)
    return [...base, ...rest].slice(0,12).map(s=>({ label:s }))
  },[tier])

  async function doSpin(){
    setSpinning(true)
    try {
      const res = await post<{ ok:true; durationMs:number; result:{title:string, coinDelta:number} }>('/api/spin', { tier: String(tier) })
      // let animation run roughly durationMs then refresh
      setTimeout(()=>{ mutate(); refWins(); setSpinning(false); alert(`Siz "${res.result.title}" yutib oldingiz 🎉`) }, res.durationMs)
    } catch (e:any) {
      setSpinning(false)
      const msg = String(e?.message||e)
      if (msg.includes('BUSY')) alert('Hozir aylanyapti, kuting.')
      else if (msg.includes('NOT_ENOUGH_COINS')) alert('Tangalar yetarli emas.')
      else alert('Xatolik.')
    }
  }

  const busy = data?.state.status === 'SPINNING' || spinning

  return (
    <div className="mx-auto max-w-6xl p-4 grid grid-cols-12 gap-4">
      {/* LEFT: Terms + winners */}
      <div className="col-span-12 md:col-span-3 space-y-4">
        <div className="card">
          <div className="font-semibold mb-2">Qoidalar (tanga olish)</div>
          <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
            <li>Onlayn 300.000 so‘m = 10 tanga</li>
            <li>Oflayn 1.000.000 so‘m = 10 tanga</li>
          </ul>
          <p className="mt-2 text-xs text-gray-400">Admin bu ro‘yxatni keyin kengaytirishi mumkin.</p>
        </div>
        <div className="card">
          <div className="font-semibold mb-2">Oxirgi 5 yutuq</div>
          {!wins?.length && <div className="text-sm text-gray-400">Hali yutuqlar ro‘yxati yo‘q.</div>}
          <ul className="space-y-2">
            {wins?.map((w,i)=>(
              <li key={i} className="text-sm">
                <span className="badge mr-2">{w.user}</span> {w.title}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">Ro‘yxat har 4 soniyada yangilanadi.</p>
        </div>
      </div>

      {/* CENTER: wheel */}
      <div className="col-span-12 md:col-span-6 text-center space-y-3">
        <div className="space-x-2">
          {[50,100,200].map(v=>(
            <button key={v} className="btn" onClick={()=>setTier(v as any)} disabled={busy}>
              {v} tanga
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-300">{data?.state.status==='SPINNING' ? 'Keyingi o‘yinchi tayyor!' : 'Aylantirishga tayyormisiz?'}</div>
        <Wheel slices={slices} spinning={busy} durationMs={4200}/>
        <div>Balans: <b>{/* not personal here */}</b></div>
        <button className="btn" onClick={doSpin} disabled={busy}>
          Spin (-{tier})
        </button>

        <details className="card">
          <summary>Barcha sovg‘alar (narxlari bilan) ▼</summary>
          <div className="mt-2 text-sm">
            {data?.store?.length ? (
              <ul className="space-y-1">
                {data.store.map(s=>(
                  <li key={s.id} className="flex items-center gap-2">
                    {s.imageUrl ? <img src={s.imageUrl} alt="" className="w-6 h-6 rounded" /> : <span className="w-6 h-6 rounded bg-gray-700 inline-block" />}
                    <span>{s.title}</span> <span className="ml-auto badge">{s.coinCost} tanga</span>
                  </li>
                ))}
              </ul>
            ) : <div className="text-gray-400">Hali do‘konda mahsulot yo‘q.</div>}
          </div>
        </details>
      </div>

      {/* RIGHT: users list (balances) */}
      <div className="col-span-12 md:col-span-3">
        <div className="card">
          <div className="font-semibold mb-2">Ishtirokchilar balansi</div>
          <ul className="divide-y divide-gray-800">
            {data?.users?.map(u=>(
              <li key={u.id} className="py-2 text-sm flex justify-between"><span className="text-gray-300">{u.username}</span><b>{u.balance}</b></li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">Ro‘yxat har 3 soniyada yangilanadi.</p>
        </div>
      </div>
    </div>
  )
}