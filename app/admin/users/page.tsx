// app/admin/users/page.tsx
'use client'
import useSWR from 'swr'
import { useState } from 'react'

type User = { id: string; username: string; balance: number }

async function api<T>(url: string, init?: RequestInit) {
  const r = await fetch(url, init)
  if (!r.ok) throw new Error(await r.text())
  return (await r.json()) as T
}
const post = (body: any) => api('/api/admin/users', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
})

export default function AdminUsers() {
  const { data, mutate } = useSWR<{ ok:boolean; users:User[] }>('/api/admin/users', api, { refreshInterval: 4000 })
  const [grant, setGrant] = useState(50)
  const [take, setTake] = useState(50)
  const [rename, setRename] = useState<Record<string,string>>({})

  const btn: React.CSSProperties = { background:'#1f2937', color:'#e5e7eb', border:'1px solid #374151', borderRadius:8, padding:'8px 12px', cursor:'pointer' }
  const input: React.CSSProperties = { background:'#0b1220', color:'#e5e7eb', border:'1px solid #374151', borderRadius:8, padding:'8px 10px' }

  return (
    <div style={{ maxWidth: 980, margin:'40px auto', padding:16 }}>
      <h2>Admin • Foydalanuvchilar</h2>

      <div style={{ display:'flex', gap:18, alignItems:'center', margin:'10px 0 18px' }}>
        <label>+ coins: <input type="number" value={grant} onChange={e=>setGrant(Number(e.target.value||0))} style={{ ...input, width:120, marginLeft:8 }}/></label>
        <label>- coins: <input type="number" value={take} onChange={e=>setTake(Number(e.target.value||0))} style={{ ...input, width:120, marginLeft:8 }}/></label>
      </div>

      <div style={{ display:'grid', gap:10 }}>
        {data?.users?.map(u => (
          <div key={u.id} style={{ border:'1px solid #1f2937', borderRadius:12, padding:12, display:'grid', gridTemplateColumns:'1fr auto auto auto auto', gap:8, alignItems:'center' }}>
            <div><b>{u.username}</b> <span style={{ opacity:.7 }}>({u.balance})</span></div>
            <button style={btn} onClick={async()=>{ await post({ action:'grant', userId:u.id, amount:grant }); await mutate() }}>+{grant}</button>
            <button style={btn} onClick={async()=>{ await post({ action:'decrease', userId:u.id, amount:take }); await mutate() }}>-{take}</button>
            <div style={{ display:'flex', gap:8 }}>
              <input style={{ ...input, width:160 }} placeholder="Yangi username" value={rename[u.id] || ''} onChange={e=>setRename(s=>({ ...s, [u.id]:e.target.value }))}/>
              <button style={btn} onClick={async()=>{ await post({ action:'rename', userId:u.id, username: (rename[u.id]||'').trim() }); await mutate() }}>Saqlash</button>
            </div>
            <button style={{ ...btn, background:'#7f1d1d', borderColor:'#7f1d1d' }} onClick={async()=>{ if(!confirm('O‘chirish?')) return; await post({ action:'delete', userId:u.id }); await mutate() }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}
