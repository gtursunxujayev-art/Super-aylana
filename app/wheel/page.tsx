// app/wheel/page.tsx
import { redirect } from 'next/navigation'
import { readSession } from '@/app/lib/auth'

export default async function WheelPage() {
  const { userId } = await readSession()
  if (!userId) redirect('/') // back to login

  // TODO: render your actual wheel UI here
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <h1 className="text-2xl font-semibold">Aylantirish sahifasi</h1>
      <p className="text-zinc-400 mt-2">Bu yerda g‘ildirak bo‘ladi.</p>
    </main>
  )
}