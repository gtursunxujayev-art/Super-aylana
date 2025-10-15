'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useRef, useState } from 'react'
import { adminGet, adminPatch, adminPost, getAdminKey, setAdminKey } from '../lib/adminApi'

type User = { id: string; username: string; balance: number; visible: boolean; createdAt: string; tgId: string }
type Prize = { id: string; title: string; coinCost: number; imageUrl?: string | null; active: boolean; showInStore: boolean; createdAt: string }

export default function AdminPage() {
  const [key, setKey] = useState<string>('')

  useEffect(() => { const saved = getAdminKey(); if (saved) setKey(saved) }, [])
  const isAuthed = useMemo(() => !!key, [key])

  const { data: users, mutate: refUsers } = useSWR<User[]>(isAuthed ? '/api/admin/users' : null, (u) => adminGet<User[]>(u), { refreshInterval: 5000 })
  const { data: prizes, mutate: refPrizes } = useSWR<Prize[]>(isAuthed ? '/api/admin/prizes' : null, (u) => adminGet<Prize[]>(u), { refreshInterval: 7000 })

  function saveKey() { setAdminKey(key.trim()); location.reload() }
  function clearKey() { setAdminKey(''); setKey('') }

  const [coinAmount, setCoinAmount] = useState<number>(50)

  async function updateUser(partial: Partial<User> & { id: string }) {
    await adminPatch('/api/admin/users', partial); refUsers()
  }
  async function giveCoins(userId: string, amount: number) {
    await adminPatch('/api/admin/users', { id: userId, addCoins: amount }); refUsers()
  }
  async function removeCoins(userId: string, amount: number) {
    await adminPatch('/api/admin/users', { id: userId, removeCoins: amount }); refUsers()
  }
  async function deleteUser(userId: string) {
    if (!confirm('Delete this user and all their records?')) return
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', 'x-admin-key': getAdminKey() ?? '' },
      body: JSON.stringify({ id: userId })
    })
    refUsers()
  }

  async function addPrize(p: { title: string; coinCost: number; imageUrl?: string }) { await adminPost('/api/admin/prizes', p); refPrizes() }
  async function updatePrize(partial: Partial<Prize> & { id: string }) { await adminPatch('/api/admin/prizes', partial); refPrizes() }

  const [newPrize, setNewPrize] = useState({ title: '', coinCost: 50, imageUrl: '' })
  const newFileRef = useRef<HTMLInputElement>(null)
  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json() as { ok: boolean; url: string }
    return data.url
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16, color: '#e5e7eb' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Admin Panel — Super-aylana</h1>

      <div style={card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Enter ADMIN_API_KEY" value={key} onChange={(e) => setKey(e.target.value)} style={input}/>
          <button style={btn} onClick={saveKey}>Save key</button>
          <button style={btnSecondary} onClick={clearKey}>Clear</button>
          <span style={{ marginLeft: 12, color: '#94a3b8' }}>Use your Vercel <code>ADMIN_API_KEY</code>.</span>
        </div>
      </div>

      {isAuthed && (
        <>
          <section style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 18, margin: '6px 0' }}>Users</h2>
            <div style={card}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: '#94a3b8' }}>Grant/Remove amount:</span>
                <input type="number" value={coinAmount} onChange={(e)=>setCoinAmount(Number(e.target.value||0))} style={{ ...input, width: 120 }}/>
              </div>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Username</th>
                    <th style={th}>Balance</th>
                    <th style={th}>Visible</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u) => (
                    <tr key={u.id}>
                      <td style={td}>
                        <InlineEdit value={u.username} onSave={(v) => updateUser({ id: u.id, username: v })}/>
                      </td>
                      <td style={td}><b>{u.balance}</b></td>
                      <td style={td}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <input type="checkbox" checked={u.visible} onChange={(e) => updateUser({ id: u.id, visible: e.target.checked })}/>
                          show on main page
                        </label>
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button style={btn} onClick={() => giveCoins(u.id, coinAmount)}>+{coinAmount}</button>
                          <button style={btnSecondary} onClick={() => removeCoins(u.id, coinAmount)}>-{coinAmount}</button>
                          <button style={{ ...btnSecondary, borderColor: '#7f1d1d', color: '#fecaca' }} onClick={() => deleteUser(u.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Prizes block unchanged from your last version (keep your existing code here) */}
          {/* ... */}
        </>
      )}
    </div>
  )
}

function InlineEdit({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', width: '100%' }}>
      <input value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} style={{ ...input, width: '100%' }} />
      <button style={btnSmall} onClick={() => onSave(v)}>Save</button>
    </span>
  )
}

const card: React.CSSProperties = { background: '#0b1220', border: '1px solid #142035', borderRadius: 12, padding: 12 }
const input: React.CSSProperties = { background: '#111827', border: '1px solid #334155', color: '#e5e7eb', borderRadius: 8, padding: '8px 10px' }
const btn: React.CSSProperties = { background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }
const btnSmall: React.CSSProperties = { ...btn, padding: '6px 10px' }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'separate', borderSpacing: 0 }
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #142035', color: '#94a3b8', fontWeight: 500 }
const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #0f172a', verticalAlign: 'middle' }
