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
            {entries.map((e, i) => {
              const rotate = sliceAngle * i;
              const color = colors[i % colors.length];
              return (
                <div key={i} className="absolute left-1/2 bottom-1/2 origin-bottom-left"
                  style={{
                    width: "50%", height: "50%",
                    transform: `rotate(${rotate}deg) skewY(${90 - sliceAngle}deg)`,
                    background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`
                  }}>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 origin-left rotate-[90deg] text-xs text-center text-white font-semibold tracking-wide"
                    style={{
                      transform: `skewY(-${90 - sliceAngle}deg) rotate(${sliceAngle/2}deg) translateX(60px)`
                    }}>
                    {e.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* center circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-neutral-900 border border-white/10 shadow-inner flex items-center justify-center text-sm text-neutral-400">
              Super Aylana
            </div>
          </div>
        </div>
      </div>

      {/* Balance + Spin */}
      <div className="flex items-center gap-4">
        <div className="px-4 py-2 rounded bg-white/5">Balance: <b>{me?.balance ?? 0}</b></div>
        <button disabled={spinning}
          onClick={spin}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold">
          {spinning ? "Aylanyapti..." : `Spin (${mode})`}
        </button>
      </div>

      {/* Popup */}
      {popup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center" onClick={()=>setPopup(null)}>
          <div className="bg-neutral-900 p-6 rounded-2xl max-w-md text-center space-y-3 shadow-xl">
            {popup.imageUrl ? (
              <img src={popup.imageUrl} alt="" className="mx-auto w-40 h-40 object-cover rounded-xl"/>
            ) : null}
            <div className="text-lg text-white">
              <b>{popup.user}</b> siz <b>{popup.prize}</b> yutib oldingiz.
            </div>
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm text-neutral-300"
              onClick={()=>setPopup(null)}>Yopish</button>
          </div>
        </div>
      )}
    </div>
  );
}
