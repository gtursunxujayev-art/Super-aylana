// app/admin/page.tsx
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/app/api/requireAdmin'

export default async function AdminPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/') // not admin -> back to login
  }

  // TODO: your real admin UI
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <h1 className="text-2xl font-semibold">Admin panel</h1>
      <p className="text-zinc-400 mt-2">Bu yerda admin boshqaruvi.</p>
    </main>
  )
}