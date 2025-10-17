'use client';
import { useState } from "react";

export default function LoginPage() {
  const [tgid, setTgid] = useState("");
  const [username, setUsername] = useState("");

  async function go() {
    const r = await fetch("/api/auth/telegram", {
      method: "POST",
      body: JSON.stringify({ tgid, username }),
      headers: { "Content-Type": "application/json" }
    });
    if (r.ok) window.location.href = "/wheel";
    else alert("Auth failed");
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Login / Register</h1>
      <p className="text-sm text-neutral-400">
        Telegram orqali kelganda avtomatik bo‘ladi. Test uchun qo‘lda kiriting.
      </p>
      <input className="w-full px-3 py-2 rounded bg-white/5" placeholder="tgid" value={tgid} onChange={e=>setTgid(e.target.value)} />
      <input className="w-full px-3 py-2 rounded bg-white/5" placeholder="username" value={username} onChange={e=>setUsername(e.target.value)} />
      <button onClick={go} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700">Continue</button>
    </div>
  );
}
