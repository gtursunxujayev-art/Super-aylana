'use client';
import { useEffect, useRef, useState } from "react";

type Me = { id: string; name: string; balance: number; role: string };
type Popup = { user: string; prize: string; imageUrl?: string | null };
type Entry = { id: string | null; name: string; imageUrl?: string | null; weight: number; kind: "item"|"another" };

// Helpers to build pie-slice paths
function deg2rad(d: number) { return (d * Math.PI) / 180; }
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = deg2rad(angleDeg);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  // Move to center, line to start, arc to end, close
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export default function WheelPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<50|100|200>(100);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [popup, setPopup] = useState<Popup | null>(null);

  const wheelRef = useRef<HTMLDivElement>(null);

  async function loadMe() {
    const r = await fetch("/api/me");
    if (r.ok) setMe(await r.json());
  }
  async function loadEntries(m: 50|100|200) {
    const r = await fetch(`/api/wheel?mode=${m}`);
    if (r.ok) setEntries(await r.json());
  }

  useEffect(()=>{ loadMe(); }, []);
  useEffect(()=>{ loadEntries(mode); }, [mode]);

  // global popup polling (everyone sees result)
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
    // Spin animation (purely visual, server already chose the result)
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

  // Visual config
  const size = 440;            // SVG size (px)
  const cx = size/2, cy = size/2;
  const radius = size/2 - 6;   // radius with border space
  const count = Math.max(6, entries.length || 8);
  const sliceAngle = 360 / count;

  // Nice repeating colors for cake slices
  const colors = [
    "#06b6d4","#f59e0b","#22c55e","#60a5fa",
    "#f472b6","#a78bfa","#fb7185","#34d399"
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

      {/* Wheel container */}
      <div className="relative mt-2">
        {/* Pointer (triangle) */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-r-[14px] border-b-[28px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow" />

        {/* Outer ring */}
        <div className="relative w-[460px] h-[460px] rounded-full bg-neutral-900 border-4 border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Spinning group */}
          <div ref={wheelRef} className="absolute inset-0 will-change-transform">
            <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" className="block">
              {/* subtle radial shine */}
              <defs>
                <radialGradient id="shine" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                  <stop offset="70%" stopColor="rgba(255,255,255,0.02)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
                </radialGradient>
              </defs>

              {/* slices */}
              {Array.from({ length: count }).map((_, i) => {
                const label = entries[i % (entries.length || 1)];
                const start = i * sliceAngle - 90;           // start at top (−90°)
                const end = start + sliceAngle;
                const path = arcPath(cx, cy, radius, start, end);
                const mid = (start + end) / 2;
                const textR = radius * 0.62;
                const pos = polarToCartesian(cx, cy, textR, mid);
                const fill = colors[i % colors.length];

                return (
                  <g key={i}>
                    {/* sector */}
                    <path d={path}
                          fill={fill}
                          stroke="#0a0a0a"
                          strokeWidth={2}
                    />
                    {/* label (cake-style, upright) */}
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={12}
                      className="fill-white"
                      transform={`rotate(${mid+90}, ${pos.x}, ${pos.y})`}
                      style={{ userSelect: "none" }}
                    >
                      {label ? label.name : "Prize"}
                    </text>
                  </g>
                );
              })}

              {/* glossy overlay */}
              <circle cx={cx} cy={cy} r={radius} fill="url(#shine)" />
            </svg>
          </div>

          {/* center hub */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 rounded-full bg-neutral-950 border border-white/10 shadow-inner flex items-center justify-center text-xs text-neutral-300">
              Super Aylana
            </div>
          </div>
        </div>
      </div>

      {/* Balance + Spin */}
      <div className="flex items-center gap-4">
        <div className="px-4 py-2 rounded bg-white/5">Balance: <b>{me?.balance ?? 0}</b></div>
        <button
          disabled={spinning}
          onClick={spin}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold"
        >
          {spinning ? "Aylanyapti..." : `Spin (${mode})`}
        </button>
      </div>

      {/* Global popup */}
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
