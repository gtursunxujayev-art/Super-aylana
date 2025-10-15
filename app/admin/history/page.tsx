// app/admin/history/page.tsx
'use client'
import useSWR from 'swr'

type Row = { id: string; user: string; prizeTitle: string; coinCost: number|null; createdAt: string }

async function api<T>(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as T
}

export default function AdminHistory() {
  const { data } = useSWR<{ ok: boolean; rows: Row[] }>('/api/admin/wins', api, { refreshInterval: 5000 })

  const th: React.CSSProperties = { textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #1f2937' }
  const td: React.CSSProperties = { padding:'10px 12px', borderBottom:'1px solid #111827', whiteSpace:'nowrap' }

  return (
    <div style={{ maxWidth: 1000, margin:'40px auto', padding:16 }}>
      <h2>Admin • Rewards history</h2>
      <div style={{ overflowX:'auto', border:'1px solid #1f2937', borderRadius:12 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={th}>User</th>
              <th style={th}>Price</th>
              <th style={th}>Prize</th>
              <th style={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows?.map(r => (
              <tr key={r.id}>
                <td style={td}>{r.user}</td>
                <td style={td}>{r.coinCost ?? '—'} tanga</td>
                <td style={td}>{r.prizeTitle}</td>
                <td style={td}>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            )) || null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
