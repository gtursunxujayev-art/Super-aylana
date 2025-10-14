'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import Wheel from '@/components/Wheel'

async function api<T>(url:string, init?:RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers:{ 'content-type':'application/json', ...(init?.headers||{}) } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
async function post<T>(url:string, body:any){ return api<T>(url,{method:'POST',body:JSON.stringify(body)}) }

type StateRes = {
  state: { status:'IDLE'|'SPINNING', userName?:string|null, tier?:number|null, resultTitle?:string|null }
  users: { id:string; username:string; balance:number }[]
  store: { id:string; title:string; coinCost:number; imageUrl?:string|null }[]
  lastWins: { user:string; title:string; imageUrl?:string|null }[]
}

export default function Page(){
  const { data, mutate } = useSWR<StateRes>('/api/state', (u)=>api<StateRes>(u), { refreshInterval: 3000 })
  const { data: wins, mutate: refWins } = useSWR<any[]>('/api/wins?take=5', (u)=>api<any[]>(u), { refreshInterval: 4000 })
  const { data: meRes, mutate: refMe } = useSWR<{ok:boolean; me?:{id:string;username:string;balance:number}}>('/api/me', (u)=>api(u), { refreshInterval: 4000 })
  const me = meRes?.me

  const [tier, setTier] = useState<50|100|200>(50)
  const [spinning, setSpinning] = useState(false)

  // Bootstrap: Telegram WebApp OR demo user (already handled in /api/bootstrap)
  useEffect(()=>{
    (async()=>{
      const w = window as any
      const tg = w?.Telegram?.WebApp
      if (tg?.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user
        await post('/api/bootstrap', { tgId:String(u.id), username: u.username || `${u.first_name||'User'} ${u.last_name||''}`.trim() })
      } else {
        const id = localStorage.getItem('demoUid') || String(Math.floor(Math.random()*1e12))
        localStorage.setItem('demoUid', id)
        const name = localStorage.getItem('demoName') || `Guest${String(id).slice(-4)}`
        localStorage.setItem('demoName', name)
        await post('/api/bootstrap', { tgId:id, username:name })
      }
      mutate(); refMe()
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  const slices = useMemo(()=>{
    const base = ['Another spin', tier===50?'+75 coins': tier===100?'+150 coins':'+300 coins']
    const rest = Array.from({length:10}, (_,i)=> `Prize ${i+1}`)
    return [...base, ...rest].slice(0,12).map(s=>({ label:s }))
  },[tier])

  async function doSpin(){
    setSpinning(true)
    try {
      const res = await post<{ ok:true; durationMs:number; result:{title:string, coinDelta:number} }>('/api/spin', { tier: String(tier) })
      setTimeout(async ()=>{
        await Promise.all([mutate(), refWins(), refMe()])
        setSpinning(false)
        alert(`"${me?.username || 'Foydalanuvchi'}", siz "${res.result.title}" yutib oldingiz 🎉`)
      }, res.durationMs)
    } catch (e:any) {
      setSpinning(false)
      const msg = String(e?.message||e)
      if (msg.includes('BUSY')) alert('Hozir aylanyapti, kuting.')
      else if (msg.includes('NOT_ENOUGH_COINS')) alert('Tangalar yetarli emas.')
      else alert('Xatolik.')
    }
  }

  const busy = data?.state.status === 'SPINNING' || spinning
  const allowGrant = process.env.NEXT_PUBLIC_ALLOW_SELF_GRANT === 'true'

  async function grant(n:number=50){
    try{
      await post('/api/dev/grant', { coins:n })
      await Promise.all([refMe(), mutate()])
    }catch{ /* ignore */ }
  }

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
        <div className="text-sm text-gray-300">
          {data?.state.status==='SPINNING' ? 'Keyingi o‘yinchi tayyor!' : 'Aylantirishga tayyormisiz?'}
        </div>

        <Wheel slices={slices} spinning={busy} durationMs={4200}/>

        <div className="text-sm">
          <span className="mr-2">Foydalanuvchi:</span>
          <b>{me?.username || '...'}</b>
          <span className="ml-4">Balans:</span>
          <b className="ml-1">{me?.balance ?? '...'}</b>
        </div>

        <button className="btn" onClick={doSpin} disabled={busy}>
          Spin (-{tier})
        </button>

        {/* Demo toolbar */}
        {allowGrant && (
          <div className="card mt-3">
            <div className="font-semibold mb-2">Demo: Coins</div>
            <div className="flex gap-2">
              <button className="btn" onClick={()=>grant(50)}>+50</button>
              <button className="btn" onClick={()=>grant(100)}>+100</button>
              <button className="btn" onClick={()=>grant(200)}>+200</button>
            </div>
            <p className="mt-2 text-xs text-gray-500">This panel is visible only when NEXT_PUBLIC_ALLOW_SELF_GRANT=true.</p>
          </div>
        )}

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