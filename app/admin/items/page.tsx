// app/admin/items/page.tsx
'use client'
import useSWR from 'swr'
import { useRef, useState } from 'react'

type Prize = { id:string; title:string; coinCost:number; imageUrl?:string|null; showInStore:boolean; active:boolean }

async function api<T>(url:string, init?:RequestInit){ const r=await fetch(url,init); if(!r.ok) throw new Error(await r.text()); return await r.json() as T }
async function upload(file: File) {
  const fd = new FormData(); fd.append('file', file)
  const r = await fetch('/api/admin/upload', { method:'POST', body: fd })
  if (!r.ok) throw new Error(await r.text())
  const j = await r.json() as { url:string }
  return j.url
}

export default function AdminItems() {
  const { data, mutate } = useSWR<{ ok:boolean; items:Prize[] }>('/api/admin/items', api, { refreshInterval: 5000 })
  const [form, setForm] = useState<Partial<Prize>>({ title:'', coinCost:50, showInStore:true, active:true })
  const fileRef = useRef<HTMLInputElement>(null)

  const card:React.CSSProperties={ border:'1px solid #1f2937', background:'#0b1220', borderRadius:12, padding:10 }
  const btn:React.CSSProperties={ background:'#1f2937', color:'#e5e7eb', border:'1px solid #374151', borderRadius:8, padding:'8px 12px', cursor:'pointer' }
  const input:React.CSSProperties={ background:'#0b1220', color:'#e5e7eb', border:'1px solid #374151', borderRadius:8, padding:'8px 10px' }

  async function save() {
    let imageUrl = form.imageUrl
    const f = fileRef.current?.files?.[0]
    if (f) imageUrl = await upload(f)
    await api('/api/admin/items', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ ...form, imageUrl }) })
    setForm({ title:'', coinCost:50, showInStore:true, active:true })
    if (fileRef.current) fileRef.current.value = ''
    await mutate()
  }

  return (
    <div style={{ maxWidth: 1000, margin:'40px auto', padding:16 }}>
      <h2>Admin • Items</h2>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:10 }}>
          {data?.items?.map(p=>(
            <div key={p.id} style={card}>
              <div style={{ display:'grid', gridTemplateColumns:'56px 1fr', gap:10 }}>
                <div style={{ width:56, height:56, borderRadius:8, overflow:'hidden', background:'#111827' }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : null}
                </div>
                <div>
                  <div><b>{p.title}</b></div>
                  <div style={{ fontSize:12, opacity:.7 }}>{p.coinCost} tanga · {p.showInStore?'Store: On':'Store: Off'} · {p.active?'Active':'Inactive'}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button style={btn} onClick={()=>setForm({ ...p })}>Edit</button>
                <button style={{ ...btn, background:'#7f1d1d', borderColor:'#7f1d1d' }} onClick={async()=>{ if(!confirm('Delete?'))return; await api(`/api/admin/items?id=${p.id}`, { method:'DELETE' }); await mutate() }}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        <div style={card}>
          <h3 style={{ marginTop:0 }}>{form?.id ? 'Edit' : 'Add'} item</h3>
          <div style={{ display:'grid', gap:10 }}>
            <label>Title<input style={{ ...input, display:'block', width:'100%', marginTop:6 }} value={form.title||''} onChange={e=>setForm(f=>({ ...f, title:e.target.value }))}/></label>
            <label>Price (50/100/200/500)
              <input type="number" step={50} style={{ ...input, display:'block', width:'100%', marginTop:6 }} value={form.coinCost||0} onChange={e=>setForm(f=>({ ...f, coinCost:Number(e.target.value||0) }))}/>
            </label>
            <label>Show in store <input type="checkbox" style={{ marginLeft:8 }} checked={!!form.showInStore} onChange={e=>setForm(f=>({ ...f, showInStore:e.target.checked }))}/></label>
            <label>Active <input type="checkbox" style={{ marginLeft:8 }} checked={!!form.active} onChange={e=>setForm(f=>({ ...f, active:e.target.checked }))}/></label>
            <label>Image<input ref={fileRef} type="file" accept="image/*" style={{ display:'block', marginTop:6 }}/></label>
            <div style={{ display:'flex', gap:8 }}>
              <button style={btn} onClick={save}>{form?.id ? 'Save' : 'Add'}</button>
              <button style={btn} onClick={()=>{ setForm({ title:'', coinCost:50, showInStore:true, active:true }); if(fileRef.current) fileRef.current.value='' }}>Clear</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
