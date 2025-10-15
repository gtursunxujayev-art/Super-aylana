// app/admin/grant/page.tsx
'use client'
import useSWR from 'swr'
import { useState } from 'react'

type User = { id: string; username: string }

async function api<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}
const post = <T,>(url: string, body: any) => api<T>(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

export default function AdminGrant() {
  const { data } = useSWR<{ ok: boolean; users: User[] }>('/api/admin/users', async (u)=> {
    const r = await api<{ ok: boolean; users: any[] }>(u)
    return { ok: r.ok, users: r.users.map(x => ({ id: x.id, username: x.username })) }
  })
  const [userId, setUserId] = useState<string>('')
  const [amount, setAmount] = useState<number>(50)

  async function submit() {
    if (!userId) return alert('User tanlang')
    await post('/api/admin/users', { action: 'grant', userId, amount })
    alert('Coins berildi.')
  }

  const input: React.CSSProperties = { background:'#0b1220', color:'#e5e7eb', border:'1px solid #374151', borderRadius:8, padding:'8px 10px' }
  const btn: React.CSSProperties = { background:'#1f2937', color:'#e5e7eb', border:'1px solid #374151', borderRadius:8, padding:'8px 12px', cursor:'pointer' }

  return (
    <div style={{ maxWidth: 600, margin:'40px auto', padding:16 }}>
      <h2>Admin • Give coins</h2>

      <div style={{ display:'grid', gap:12 }}>
        <label>User
          <select style={{ ...input, display:'block', width:'100%', marginTop:6 }} value={userId} onChange={(e)=>setUserId(e.target.value)}>
            <option value="">— Select user —</option>
            {data?.users?.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
        </label>

        <label>Amount
          <input type="number" style={{ ...input, display:'block', width:'100%', marginTop:6 }}
                 value={amount} onChange={(e)=>setAmount(Number(e.target.value||0))}/>
        </label>

        <div><button style={btn} onClick={submit}>Give</button></div>
      </div>
    </div>
  )
}
