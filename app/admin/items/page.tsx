// app/admin/items/page.tsx
'use client'
import useSWR from 'swr'
import { useRef, useState } from 'react'

type Prize = {
  id: string
  title: string
  coinCost: number
  imageUrl?: string | null
  showInStore: boolean
  active: boolean
}

type ListRes = { ok: boolean; items: Prize[] }

async function api<T>(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

async function uploadImage(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json() as { url: string }
  return data.url
}

export default function AdminItems() {
  const { data, mutate } = useSWR<ListRes>('/api/admin/items', (u) => api<ListRes>(u), { refreshInterval: 5000 })
  const [form, setForm] = useState<{ id?: string; title: string; coinCost: number; showInStore: boolean; active: boolean; imageUrl?: string }>({ title: '', coinCost: 50, showInStore: true, active: true })
  const fileRef = useRef<HTMLInputElement>(null)

  function edit(p: Prize) {
    setForm({ id: p.id, title: p.title, coinCost: p.coinCost, showInStore: p.showInStore, active: p.active, imageUrl: p.imageUrl || undefined })
  }

  async function save() {
    let imageUrl = form.imageUrl
    const f = fileRef.current?.files?.[0]
    if (f) imageUrl = await uploadImage(f)

    await api('/api/admin/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, imageUrl }),
    })
    setForm({ title: '', coinCost: 50, showInStore: true, active: true })
    if (fileRef.current) fileRef.current.value = ''
    await mutate()
  }

  async function remove(id: string) {
    if (!confirm('O‘chirishni tasdiqlang.')) return
    await api(`/api/admin/items?id=${id}`, { method: 'DELETE' })
    await mutate()
  }

  const card: React.CSSProperties = { border: '1px solid #1f2937', background:'#0b1220', borderRadius:12, padding:12 }
  const btn: React.CSSProperties = { background:'#1f2937', color:'#e5e7eb', border:'1px solid #374151', borderRadius:8, padding:'8px 12px', cursor:'pointer' }
  const input: React.CSSProperties = { background:'#0b1220', color:'#e5e7eb', border:'1px solid #374151', borderRadius:8, padding:'8px 10px' }

  return (
    <div style={{ maxWidth: 1000, margin: '40px auto', padding: 16 }}>
      <h2>Admin • Items</h2>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:16 }}>
        <div style={{ display:'grid', gap:10 }}>
          {data?.items?.map(p => (
            <div key={p.id} style={{ ...card, display:'grid', gridTemplateColumns:'60px 1fr auto auto', gap:10, alignItems:'center' }}>
              <div style={{ width:60, height:60, background:'#111827', borderRadius:8, overflow:'hidden' }}>
                {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : null}
              </div>
              <div>
                <div><b>{p.title}</b> <span style={{ opacity:.7 }}>• {p.coinCost} tanga</span></div>
                <div style={{ fontSize:12, opacity:.7 }}>{p.showInStore ? 'Store: ko‘rinadi' : 'Store: yashirin'} · {p.active ? 'Active' : 'Inactive'}</div>
              </div>
              <button style={btn} onClick={() => edit(p)}>Edit</button>
              <button style={{ ...btn, background:'#7f1d1d', borderColor:'#7f1d1d' }} onClick={() => remove(p.id)}>Delete</button>
            </div>
          ))}
        </div>

        <div style={card}>
          <h3 style={{ marginTop:0 }}>{form.id ? 'Edit item' : 'Add item'}</h3>
          <div style={{ display:'grid', gap:10 }}>
            <label>Title
              <input style={{ ...input, display:'block', width:'100%', marginTop:6 }} value={form.title} onChange={(e)=>setForm(f=>({ ...f, title:e.target.value }))}/>
            </label>

            <label>Price (50 | 100 | 200 | 500)
              <input type="number" min={0} step={50} style={{ ...input, display:'block', width:'100%', marginTop:6 }}
                     value={form.coinCost} onChange={(e)=>setForm(f=>({ ...f, coinCost: Number(e.target.value||0) }))}/>
            </label>

            <label>Show in store
              <input type="checkbox" style={{ marginLeft:8 }} checked={form.showInStore} onChange={(e)=>setForm(f=>({ ...f, showInStore:e.target.checked }))}/>
            </label>

            <label>Active
              <input type="checkbox" style={{ marginLeft:8 }} checked={form.active} onChange={(e)=>setForm(f=>({ ...f, active:e.target.checked }))}/>
            </label>

            <label>Image
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'block', marginTop:6 }}/>
              {form.imageUrl ? <div style={{ marginTop:6, fontSize:12, opacity:.7 }}>Current: {form.imageUrl}</div> : null}
            </label>

            <div style={{ display:'flex', gap:8 }}>
              <button style={btn} onClick={save}>{form.id ? 'Save changes' : 'Add item'}</button>
              <button style={btn} onClick={() => { setForm({ title:'', coinCost:50, showInStore:true, active:true }); if (fileRef.current) fileRef.current.value='' }}>Clear</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
