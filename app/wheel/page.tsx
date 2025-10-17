'use client';
import { useEffect, useRef, useState } from "react";

type Me = { id: string; name: string; balance: number; role: string };
type Popup = { user: string; prize: string; imageUrl?: string | null };
type Entry = { id: string | null; name: string; imageUrl?: string | null; weight: number; kind: "item"|"another" };

export default function WheelPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<50|100|200>(100);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [popup, setPopup] = useState<Popup | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  async function loadMe() {
    const r = await fetch("/api/me"); if (r.ok) setMe(await r.json());
  }
  async function loadEntries(m: 50|100|200) {
    const r = await fetch(`/api/wheel?mode=${m}`);
    if (r.ok) setEntries(await r.json());
  }

  useEffect(()=>{ loadMe(); }, []);
  useEffect(()=>{ loadEntries(mode); }, [mode]);

  // global popup polling
  useEffect(()=>{
    const t = setInterval(async ()=>{
      const r = await fetch("/api/spin/state");
      const j = await r.json();
      if (j.lastPopup) setPopup(j.lastPopup);
    }, 1000);
    return ()=>clearInterval(t);
  }, []);

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    const r = await fetch("/api/spin/start", {
      method: "POST",
      body: JSON.stringify({ mode }),
      headers: { "Content-Type": "application/json" }
    });

    if (!r.ok) {
      const j = await r.json().catch(()=>({}));
      alert(j?.error === "BUSY" ? "Hozir aylanmoqda, kuting." :
            j?.error === "NOT_ENOUGH_COINS" ? "Koin yetarli emas." : "Xatolik.");
      setSpinning(false);
      return;
    }

    const j = await r.json();
    const deg = 360 * 8 + Math.floor(Math.random() * 360);
    if (wheelRef.current) {
      wheelRef.current.style.transition = `transform ${j.spinMs/1000}s cubic-bezier(.2,.9,.2,1)`;
      wheelRef.current.style.transform = `rotate(${deg}deg)`;
    }

    setTimeout(()=>{
      setSpinning(false);
      loadMe();
      setPopup({
        user: me?.name ?? "Siz",
        prize: j.result.type === "another" ? "Yana bir bor aylantirish" : j.result.name,
        imageUrl: j.result.imageUrl
      });
    }, j.spinMs);
  }

  const sliceCount = entries.length || 8;
  const sliceAngle = 360 / sliceCount;
  const colors = [
    "#F87171", "#60A5FA", "#34D399", "#FBBF24",
    "#A78BFA", "#F472B6", "#22D3EE", "#4ADE80"
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Mode buttons */}
      <div className="flex gap-2">
        {[50,100,200].map(m=>(
          <button key={m} onClick={()=>setMode(m as 50|100|200)}
            className={`px-4 py-2 rounded font-medium ${mode===m?'bg-emerald-600 text-white':'bg-white/10 hover:bg-white/20'}`}>
            {m}
          </button>
        ))}
      </div>

      {/* WHEEL */}
      <div className="relative mt-4">
        {/* Pointer */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-r-[14px] border-b-[28px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow" />

        <div className="relative w-[420px] h-[420px] rounded-full border-4 border-white/20 bg-neutral-950 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          <div ref={wheelRef} className="absolute inset-0 rounded-full transition-transform">
