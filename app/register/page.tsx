'use client'
import { useState } from 'react'

export default function Register() {
  const [username, setU] = useState('')
  const [password, setP] = useState('')

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await fetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) })
          if (r.ok) location.href = '/'
          else alert('Ro‘yxatdan o‘tishda xato')
        }}
        className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 p-5"
      >
        <h1 className="text-lg font-semibold">Register</h1>
        <input className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10" placeholder="Username" value={username} onChange={(e) => setU(e.target.value)} />
        <input className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10" type="password" placeholder="Parol" value={password} onChange={(e) => setP(e.target.value)} />
        <button className="w-full px-3 py-2 rounded-md bg-white text-black font-medium">Ro‘yxatdan o‘tish</button>
      </form>
    </div>
  )
}
