'use client';
import { useEffect, useMemo, useRef, useState } from "react";

type Me = { id: string; name: string; balance: number; role: string };
type Popup = { user: string; prize: string; imageUrl?: string | null };

export default function WheelPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<50|100|200>(100);
  const [spinning, setSpinning] = useState(false);
  const [popup, setPopup] = useState<Popup | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  async function loadMe() {
    const r = await fetch("/api/me"); if (r.ok) setMe(await r.json());
  }
  useEffect(()=>{ loadMe(); }, []);

  // poll state for global popups
  useEffect(()=>{
    const t = setInterval(async ()=>{
      const r = await fetch("/api/spin/state"); const j = await r.json();
      if (j.lastPopup) setPopup(j.lastPopup);
    }, 1000);
    return ()=>clearInterval(t);
  }, []);

  const colors = useMemo(()=>["#F87171","#60A5FA","#34D399","#FBBF24","#A78BFA","#F472B6","#22D3EE","#4ADE80","#E879F9","#FB7185"],[]);
  const sectors = 12; // visual only

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
    // fake animation
    const turns = 8;
    const deg = 360 * turns + Math.floor(Math.random() * 360);
    if (wheelRef.current) {
      wheelRef.current.style.transition = `transform ${j.spinMs/1000}s cubic-bezier(.2,.9,.2,1)`;
      wheelRef.current.style.transform = `rotate(${deg}deg)`;
    }
    setTimeout(()=>{
      setSpinning(false);
      loadMe();
      setPopup({ user: me?.name ?? "Siz", prize: j.result.type === "another" ? "Yana bir bor aylantirish" : j.result.name, imageUrl: j.result.imageUrl });
    }, j.spinMs);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-2">
        {[50,100,200].map(m=>(
          <button key={m} onClick={()=>setMode(m as 50|100|200)} className={`px-4 py-2 rounded ${mode===m?'bg-emerald-600':'bg-white/10 hover:bg-white/20'}`}>{m}</button>
        ))}
      </div>

      <div className="relative">
        {/* pointer */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-l-transparent border-r-transparent border-b-yellow-400"></div>

        {/* wheel */}
        <div ref={wheelRef} className="w-[360px] h-[360px] rounded-full border-4 border-white/20 relative overflow-hidden">
          {[...Array(sectors)].map((_,i)=>(
            <div key={i}
              className="absolute w-1/2 h-1/2 origin-bottom-left"
              style={{
                left: "50%", bottom: "50%",
                transform: `rotate(${(360/sectors)*i}deg) skewY(${90-(360/sectors)}deg)`,
                background: colors[i % colors.length]
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="px-4 py-2 rounded bg-white/5">Balance: <b>{me?.balance ?? 0}</b></div>
        <button disabled={spinning} onClick={spin} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
          {spinning ? "Aylanyapti..." : `Spin (${mode})`}
        </button>
      </div>

      {/* Popup */}
      {popup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center" onClick={()=>setPopup(null)}>
          <div className="bg-neutral-900 p-6 rounded-2xl max-w-md text-center space-y-3">
            {popup.imageUrl ? <img src={popup.imageUrl} alt="" className="mx-auto w-40 h-40 object-cover rounded-xl"/> : null}
            <div className="text-lg">
              <b>{popup.user}</b> siz <b>{popup.prize}</b> yutib oldingiz.
            </div>
            <button className="px-4 py-2 bg-white/10 rounded" onClick={()=>setPopup(null)}>Yopish</button>
          </div>
        </div>
      )}
    </div>
  );
}
