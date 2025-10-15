// app/admin/page.tsx
import Link from 'next/link'
import { requireAdmin } from '@/app/api/requireAdmin'

export default async function AdminHome() {
  await requireAdmin()

  const card: React.CSSProperties = {
    border: '1px solid #1f2937',
    background: '#0b1220',
    padding: 18,
    borderRadius: 14,
  }

  const btn: React.CSSProperties = {
    display: 'inline-block',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #374151',
    background: '#111827',
    color: '#e5e7eb',
    textDecoration: 'none',
    minWidth: 200,
    textAlign: 'center',
  }

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 18 }}>Admin</h1>

      <div style={{ display: 'grid', gap: 16 }}>
        <div style={card}>
          <h3 style={{ margin: '0 0 10px' }}>Users</h3>
          <p style={{ margin: '0 0 12px', opacity: .8 }}>
            Change username, reset password, delete accounts.
          </p>
          <Link href="/admin/users" style={btn}>Open Users</Link>
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 10px' }}>Items</h3>
          <p style={{ margin: '0 0 12px', opacity: .8 }}>
            Add new items, upload image, set price (50/100/200/500), toggle “show in store”.
          </p>
          <Link href="/admin/items" style={btn}>Open Items</Link>
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 10px' }}>Rewards history</h3>
          <p style={{ margin: '0 0 12px', opacity: .8 }}>
            View last wins with User • Price • Prize • Date.
          </p>
          <Link href="/admin/history" style={btn}>Open Rewards</Link>
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 10px' }}>Give coins</h3>
          <p style={{ margin: '0 0 12px', opacity: .8 }}>
            Select a user and grant any amount of coins.
          </p>
          <Link href="/admin/grant" style={btn}>Open Give Coins</Link>
        </div>
      </div>
    </div>
  )
}
