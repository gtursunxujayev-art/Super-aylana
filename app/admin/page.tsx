'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useRef, useState } from 'react'
import { adminGet, adminPatch, adminPost, getAdminKey, setAdminKey } from '../lib/adminApi'

type User = { id: string; username: string; balance: number; visible: boolean; createdAt: string; tgId: string }
type Prize = { id: string; title: string; coinCost: number; imageUrl?: string | null; active: boolean; showInStore: boolean; createdAt: string }

export default function AdminPage() {
  const [key, setKey] = useState<string>('')

  useEffect(() => {
    const saved = getAdminKey()
    if (saved) setKey(saved)
  }, [])

  const isAuthed = useMemo(() => !!key, [key])

  const { data: users, mutate: refUsers, error: usersErr } = useSWR<User[]>(
    isAuthed ? '/api/admin/users' : null,
    (u) => adminGet<User[]>(u),
    { refreshInterval: 5000 }
  )
  const { data: prizes, mutate: refPrizes, error: prizesErr } = useSWR<Prize[]>(
    isAuthed ? '/api/admin/prizes' : null,
    (u) => adminGet<Prize[]>(u),
    { refreshInterval: 7000 }
  )

  function saveKey() { setAdminKey(key.trim()); location.reload() }
  function clearKey() { setAdminKey(''); setKey('') }

  // Users actions
  const [coinAmount, setCoinAmount] = useState<number>(50)
  async function updateUser(partial: Partial<User> & { id: string }) {
    await adminPatch('/api/admin/users', partial)
    refUsers()
  }
  async function giveCoins(userId: string, amount: number) {
    await adminPatch('/api/admin/users', { id: userId, addCoins: amount })
    refUsers()
  }
  async function removeCoins(userId: string, amount: number) {
    await adminPatch('/api/admin/users', { id: userId, removeCoins: amount })
    refUsers()
  }

  // Prizes actions
  async function addPrize(p: { title: string; coinCost: number; imageUrl?: string }) {
    await adminPost('/api/admin/prizes', p)
    refPrizes()
  }
  async function updatePrize(partial: Partial<Prize> & { id: string }) {
    await adminPatch('/api/admin/prizes', partial)
    refPrizes()
  }

  // Add-prize local state + file ref
  const [newPrize, setNewPrize] = useState({ title: '', coinCost: 50, imageUrl: '' })
  const newFileRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json() as { ok: boolean; url: string }
    return data.url
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16, color: '#e5e7eb' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Admin Panel — Super-aylana</h1>

      {/* Admin key bar */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Enter ADMIN_API_KEY" value={key} onChange={(e) => setKey(e.target.value)} style={input}/>
          <button style={btn} onClick={saveKey}>Save key</button>
          <button style={btnSecondary} onClick={clearKey}>Clear</button>
          <span style={{ marginLeft: 12, color: '#94a3b8' }}>
            Set this to your Vercel env <code>ADMIN_API_KEY</code> value.
          </span>
        </div>
      </div>

      {!isAuthed && <div style={{ ...card, marginTop: 12, borderColor: '#7F1D1D' }}>Enter the key above to load data.</div>}

      {isAuthed && (
        <>
          {/* Users */}
          <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 18, margin: '6px 0' }}>Users</h2>
            <div style={card}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: '#94a3b8' }}>Grant/Remove amount:</span>
                <input type="number" value={coinAmount} onChange={(e)=>setCoinAmount(Number(e.target.value||0))} style={{ ...input, width: 120 }}/>
                <span style={{ color: '#94a3b8' }}>(e.g. 10, 25, 75, 300…)</span>
              </div>

              {usersErr && <div style={{ color: '#fca5a5' }}>Error loading users (wrong key?).</div>}
              {!users?.length && !usersErr && <div style={{ color: '#94a3b8' }}>No users yet.</div>}

              {!!users?.length && (
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
                    {users.map((u) => (
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Prizes */}
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18, margin: '6px 0' }}>Prizes</h2>

            {/* Add prize */}
            <div style={{ ...card, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Add prize</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8 }}>
                <input placeholder="Title" value={newPrize.title} onChange={(e) => setNewPrize(p => ({ ...p, title: e.target.value }))} style={input}/>
                <select value={newPrize.coinCost} onChange={(e) => setNewPrize(p => ({ ...p, coinCost: Number(e.target.value) }))} style={input as any}>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
                <input placeholder="Image URL (optional)" value={newPrize.imageUrl} onChange={(e) => setNewPrize(p => ({ ...p, imageUrl: e.target.value }))} style={input}/>
                <button
                  style={btn}
                  onClick={async () => {
                    let imageUrl = newPrize.imageUrl.trim() || ''
                    const file = newFileRef.current?.files?.[0]
                    if (file) imageUrl = await uploadFile(file)
                    if (!newPrize.title.trim()) return alert('Title required')
                    await addPrize({ title: newPrize.title.trim(), coinCost: newPrize.coinCost, imageUrl: imageUrl || undefined })
                    setNewPrize({ title: '', coinCost: 50, imageUrl: '' })
                    if (newFileRef.current) newFileRef.current.value = ''
                  }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <input type="file" ref={newFileRef} style={input} />
                <span style={{ color: '#94a3b8', fontSize: 12 }}>You can either paste an Image URL or upload a file.</span>
              </div>
            </div>

            {/* List prizes */}
            <div style={card}>
              {prizesErr && <div style={{ color: '#fca5a5' }}>Error loading prizes (wrong key?).</div>}
              {!prizes?.length && !prizesErr && <div style={{ color: '#94a3b8' }}>No prizes yet.</div>}
              {!!prizes?.length && (
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Title</th>
                      <th style={th}>Cost</th>
                      <th style={th}>Active</th>
                      <th style={th}>Show in store</th>
                      <th style={th}>Image</th>
                      <th style={th}>Upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prizes.map((p) => (
                      <PrizeRow key={p.id} prize={p} onUpdate={updatePrize}/>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function PrizeRow({ prize, onUpdate }: { prize: Prize; onUpdate: (p: Partial<Prize> & { id: string }) => Promise<void> }) {
  const upRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function uploadAndSet() {
    const file = upRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as { ok: boolean; url: string }
      await onUpdate({ id: prize.id, imageUrl: data.url })
      if (upRef.current) upRef.current.value = ''
    } catch (e:any) {
      alert('Upload failed: ' + (e?.message || e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <tr>
      <td style={td}>
        <InlineEdit value={prize.title} onSave={(v) => onUpdate({ id: prize.id, title: v })}/>
      </td>
      <td style={td}>
        <select
          value={prize.coinCost}
          onChange={(e) => onUpdate({ id: prize.id, coinCost: Number(e.target.value) })}
          style={input as any}
        >
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={500}>500</option>
        </select>
      </td>
      <td style={td}>
        <input type="checkbox" checked={prize.active} onChange={(e) => onUpdate({ id: prize.id, active: e.target.checked })}/>
      </td>
      <td style={td}>
        <input type="checkbox" checked={prize.showInStore} onChange={(e) => onUpdate({ id: prize.id, showInStore: e.target.checked })}/>
      </td>
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InlineEdit
            value={prize.imageUrl || ''}
            placeholder="https://…"
            onSave={(v) => onUpdate({ id: prize.id, imageUrl: v || null })}
          />
          {prize.imageUrl ? <img src={prize.imageUrl} width={28} height={28} style={{ borderRadius: 6 }} /> : <span style={{ width: 28, height: 28, background: '#334155', display: 'inline-block', borderRadius: 6 }} />}
        </div>
      </td>
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="file" ref={upRef} style={input}/>
          <button style={btn} onClick={uploadAndSet} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</button>
        </div>
      </td>
    </tr>
  )
}

/* small inline components & styles */

function InlineEdit({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', width: '100%' }}>
      <input
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        style={{ ...input, width: '100%' }}
      />
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