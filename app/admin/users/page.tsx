// app/admin/users/page.tsx
'use client'
import useSWR from 'swr'
import { useState } from 'react'

type User = { id: string; username: string; balance: number; tgId?: string|null }
type UsersRes = { ok: boolean; users: User[] }

async function api<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}
const post = <T,>(url: string, body: any) => api<T>(url, { method: 'POST', body: JSON.stringify(body) })

export default function AdminUsers() {
  const { data, mutate } = useSWR<UsersRes>('/api/admin/users', (u) => api<UsersRes>(u), { refreshInterval: 5000 })
  const [amount, setAmount] = useState<number>(50)

  async function grant(userId: string) {
    await post('/api/admin/users', { action: 'grant', userId, amount })
    await mutate()
  }
  async function remove(userId: string) {
    if (!confirm('Haqiqatan ham ushbu foydalanuvchini o‘chirasizmi?')) return
    await post('/api/admin/users', { action: 'delete', userId })
    await mutate()
  }
  async function resetPw(userId: string, username: string) {
    const r = await post<{ ok: boolean; tempPassword: string }>('/api/admin/users', { action: 'resetPassword', userId })
    alert(`Yangi vaqtinchalik parol (${username}):\n\n${r.tempPassword}\n\nIltimos, foydalanuvchiga yuboring.`)
  }

  const btn: React.CSSProperties = {
    background: '#1f2937',
    color: '#e5e7eb',
    border: '1px solid #374151',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer'
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
      <h2>Admin • Foydalanuvchilar</h2>

      <div style={{ margin: '12px 0' }}>
        <label>Beriladigan tangalar: </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value || '0', 10))}
          style={{ width: 120, marginLeft: 8 }}
        />
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {data?.users?.map(u => (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems:'center', padding: '10px 12px', border: '1px solid #1f2937', borderRadius: 10 }}>
            <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              <b>{u.username}</b> <span style={{ opacity:.7 }}>({u.balance})</span>
            </div>
            <button onClick={() => grant(u.id)} style={btn}>+{amount}</button>
            <button onClick={() => resetPw(u.id, u.username)} style={btn}>Reset password</button>
            <button onClick={() => remove(u.id)} style={{ ...btn, background:'#7f1d1d', borderColor:'#7f1d1d' }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}
