'use client';

import { useEffect, useRef, useState } from "react";

/* ---------- Types ---------- */
type Me = { id: string; name: string; balance: number; role: string; login?: string };
type Popup = { spinId: string; user: string; prize: string; imageUrl?: string | null; mode?: 50|100|200 };
type Entry = { id: string | null; name: string; imageUrl?: string | null; weight: number; kind: "item" | "another" };
type Win = { id: string; user: string; prize: string; imageUrl?: string | null; time: string };

/* ---------- Geometry helpers ---------- */
function deg2rad(d:number){return d*Math.PI/180;}
function polar(cx:number,cy:number,r:number,aDeg:number){const a=deg2rad(aDeg);return {x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)};}
function arcPath(cx:number,cy:number,r:number,start:number,end:number){const s=polar(cx,cy,r,start),e=polar(cx,cy,r,end);const large=end-start<=180?0:1;return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`; }

/** Read current rotation (0..359) from CSS matrix */
function readCurrentDeg(el: HTMLElement){
  const tr = getComputedStyle(el).transform;
  if (!tr || tr === "none") return 0;
  const m = tr.match(/^matrix\(([^)]+)\)$/);
  if (!m) return 0;
  const [aStr,bStr] = m[1].split(",").map(s=>s.trim());
  const a = parseFloat(aStr), b = parseFloat(bStr);
  const angle = Math.atan2(b, a) * 180 / Math.PI;
  return (angle + 360) % 360;
}

/** Extra degrees to land pointer on center of sliceIndex (add 2 full turns) */
function deltaToCenterFrom(currentDeg:number, sliceIndex:number, total:number){
  const slice = 360/total;
  const center = sliceIndex*slice + slice/2;
  const mod = ((-center - currentDeg) % 360 + 360) % 360;
  return 720 + mod; // 2 full rotations + alignment
}

/* ========== Component ========== */
export default function WheelPage(){
  /* ---------- Data ---------- */
  const [me,setMe]=useState<Me|null>(null);
  const [mode,setMode]=useState<50|100|200>(100);
  const [entries,setEntries]=useState<Entry[]>([]);
  const [wins,setWins]=useState<Win[]>([]);
  const [popup,setPopup]=useState<Popup|null>(null);

  /* ---------- UI/Global state ---------- */
  const [spinning,setSpinning]=useState(false);
  const [banner,setBanner]=useState<string|null>(null); // “X aylantiryapti…”
  const currentSpinId=useRef<string|null>(null);
  const startedAt=useRef<number|null>(null);

  // Wheel element & snapshot of entries AT SPIN START
  const wheelRef=useRef<HTMLDivElement>(null);
  const entriesAtSpinRef=useRef<Entry[]>([]);

  // Result to show after animation (never lost even if event fires early)
  const resultRef=useRef<Popup|null>(null);

  // A guard preventing double-finalization
  const finishedRef=useRef(false);

  /* ---------- Loaders ---------- */
  async function loadMe(){const r=await fetch("/api/me",{cache:"no-store"}); if(r.ok) setMe(await r.json());}
  async function loadEntries(m:50|100|200){const r=await fetch(`/api/wheel?mode=${m}`,{cache:"no-store"}); if(r.ok) setEntries(await r.json());}
  async function loadWins(){const r=await fetch("/api/recent-wins",{cache:"no-store"}); if(r.ok) setWins(await r.json());}

  useEffect(()=>{ loadMe(); loadWins(); },[]);
  useEffect(()=>{ loadEntries(mode); },[mode]);

  /* ---------- Wheel helpers ---------- */
  function forceReflow(el: HTMLElement){ void el.offsetHeight; }

  function resetWheelTo(deg:number){
    const el=wheelRef.current; if(!el) return;
    el.style.animation="none";
    el.style.transition="none";
    el.style.transform=`rotate(${deg}deg)`;
    forceReflow(el);
  }

  function startWaitingSpin(){
    const el=wheelRef.current; if(!el) return;
    el.style.transition="none";
    el.style.animation="spinLinear 900ms linear infinite";
  }

  /** Finish: freeze, compute target, ease to it, guarantee cleanup */
  function finishToPrize(p: Popup, totalMsTarget=10000){
    const el=wheelRef.current; if(!el) return;
    if (finishedRef.current) return;
    finishedRef.current = true;

    // read current angle WHILE animation is on
    const current = readCurrentDeg(el);
    // stop animation and freeze at current
    resetWheelTo(current);

    // compute remaining time so total ≈ totalMsTarget
    const now = Date.now();
    const elapsed = startedAt.current ? Math.max(0, now - startedAt.current) : 0;
    const remaining = Math.max(1200, Math.min(4500, totalMsTarget - elapsed)); // 1.2–4.5s

    // pick from snapshot taken at SPIN_START
    const list = entriesAtSpinRef.current.length ? entriesAtSpinRef.current : entries;
    const total = Math.max(8, list.length || 8);
    let idx = list.findIndex(e => e.name === p.prize || (p.prize.includes("Yana") && e.kind==="another"));
    if (idx < 0) idx = 0;

    // compute final angle (ensure at least small delta so transition fires)
    let delta = deltaToCenterFrom(current, idx, total);
    if (delta < 1) delta += 360; // add one extra turn to guarantee visible motion
    const finalDeg = current + delta;

    // run the ease-out
    el.style.transition = `transform ${remaining}ms cubic-bezier(.12,.9,.18,1)`;
    el.style.transform  = `rotate(${finalDeg}deg)`;

    // Guaranteed finalize: transitionend + timeout fallback
    const finalize = ()=>{
      el.removeEventListener('transitionend', onEnd);
      // normalize rotation (keep 0..359) to avoid accumulated huge angles
      const normalized = ((finalDeg % 360) + 360) % 360;
      resetWheelTo(normalized);

      setSpinning(false);
      setBanner(null);
      setPopup(resultRef.current);
      resultRef.current = null;
    };
    const onEnd = ()=> finalize();
    el.addEventListener('transitionend', onEnd, { once: true });
    setTimeout(finalize, remaining + 80);
  }

  /* ---------- Polling (authoritative) ---------- */
  useEffect(()=>{
    let stop=false;
    const tick=async ()=>{
      try{
        const r=await fetch("/api/spin/state",{cache:"no-store"});
        if(!r.ok) return;
        const data=await r.json();
        const state = data?.state ?? { status: data?.status, spinId: data?.spinId, by: data?.by, mode: data?.mode, startedAt: data?.startedAt };
        const lastPopup: Popup | null = data?.lastPopup ?? data?.popup ?? null;

        if (state?.status === "SPINNING" && state.spinId){
          setSpinning(true);
          setBanner(state.by ?? null);
          startedAt.current = state.startedAt ?? Date.now();

          if (currentSpinId.current !== state.spinId){
            // NEW spin started globally
            currentSpinId.current = state.spinId;
            finishedRef.current = false;

            // capture the entries used for THIS spin (don’t change during flight)
            entriesAtSpinRef.current = entries.slice();

            resetWheelTo(0);
            startWaitingSpin();
            if (state.mode && state.mode !== mode) setMode(state.mode);
          }
        }

        if (lastPopup?.spinId && lastPopup.spinId === currentSpinId.current){
          resultRef.current = lastPopup;
          finishToPrize(lastPopup, 10000);
          await loadWins(); await loadMe();
          currentSpinId.current = null;
        }
      }catch{}
      if(!stop) setTimeout(tick, 450);
    };
    tick();
    return ()=>{ stop=true; };
  },[entries, mode]);

  /* ---------- SSE (fast path) ---------- */
  useEffect(()=>{
    const es = new EventSource("/api/spin/stream");

    es.addEventListener("SPIN_START", (e:any)=>{
      const s = JSON.parse(e.data); // {spinId,by,mode,startedAt}
      if(!s?.spinId) return;

      setSpinning(true);
      setBanner(s.by ?? null);
      startedAt.current = s.startedAt ?? Date.now();

      if (currentSpinId.current !== s.spinId){
        currentSpinId.current = s.spinId;
        finishedRef.current = false;
        entriesAtSpinRef.current = entries.slice();

        resetWheelTo(0);
        startWaitingSpin();
        if (s.mode && s.mode !== mode) setMode(s.mode);
      }
    });

    es.addEventListener("SPIN_RESULT", (e:any)=>{
      const d = JSON.parse(e.data);
      const p: Popup | undefined = d?.popup;
      if (!p?.spinId) return;
      if (p.spinId === currentSpinId.current){
        resultRef.current = p;
        finishToPrize(p, 10000);
        loadWins(); loadMe();
        currentSpinId.current = null;
      }
    });

    es.addEventListener("ping", ()=>{});
    es.onerror = () => {};
    return ()=> es.close();
  },[entries, mode]);

  /* ---------- Local click ---------- */
  async function spin(){
    if (spinning) return;
    setSpinning(true);
    setBanner(me?.name ?? null);
    startedAt.current = Date.now();
    finishedRef.current = false;
    entriesAtSpinRef.current = entries.slice();

    resetWheelTo(0);
    startWaitingSpin();

    const r = await fetch("/api/spin/start",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode})
    });
    if (!r.ok){
      // revert visuals if server refused
      setSpinning(false);
      setBanner(null);
      resetWheelTo(0);
      const j = await r.json().catch(()=>({}));
      alert(j?.error==="BUSY"?"Hozir aylanmoqda, kuting.":j?.error==="NOT_ENOUGH_COINS"?"Koin yetarli emas.":"Xatolik.");
      return;
    }
    // Wait for SPIN_START / SPIN_RESULT (global sync)
  }

  /* ---------- Visuals ---------- */
  const size=420, cx=size/2, cy=size/2, radius=size/2-6;
  const count=Math.max(8, entries.length || 8);
  const sliceAngle=360/count;
  const colors=["#06b6d4","#f59e0b","#22c55e","#60a5fa","#f472b6","#a78bfa","#fb7185","#34d399"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_340px] gap-8 items-start">
      <style jsx>{`
        @keyframes spinLinear {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* LEFT */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Mode buttons */}
        <div className="flex gap-2">
          {[50,100,200].map(m=>(
            <button key={m}
              onClick={()=>setMode(m as 50|100|200)}
              className={`px-4 py-2 rounded font-medium ${mode===m?'bg-emerald-600 text-white':'bg-white/10 hover:bg-white/20'}`}>
              {m}
            </button>
          ))}
        </div>

        {/* Banner (fixed gap) */}
        <div className="h-8 flex items-center">
          {banner && (
            <div className="px-4 py-1 rounded-md bg-amber-500/15 text-amber-300 text-sm">
              <b>{banner}</b> aylantiryapti…
            </div>
          )}
        </div>

        {/* Wheel */}
        <div className="relative">
          {/* Pointer */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-r-[14px] border-b-[28px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow" />
          {/* Frame + Wheel */}
          <div className="relative w-[460px] h-[460px] rounded-full bg-neutral-900 border-4 border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden">
            <div ref={wheelRef} className="absolute inset-0" style={{transform:"rotate(0deg)"}}>
              <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%">
                <defs>
                  <radialGradient id="shine" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                    <stop offset="70%" stopColor="rgba(255,255,255,0.02)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
                  </radialGradient>
                </defs>
                {Array.from({length:count}).map((_,i)=>{
                  const label=entries[i % (entries.length||1)];
                  const start=i*sliceAngle-90, end=start+sliceAngle;
                  const path=arcPath(cx,cy,radius,start,end);
                  const mid=(start+end)/2;
                  const p=polar(cx,cy,radius*0.62,mid);
                  const fill=colors[i%colors.length];
                  return (
                    <g key={i}>
                      <path d={path} fill={fill} stroke="#0a0a0a" strokeWidth={2}/>
                      <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={12}
                        className="fill-white" transform={`rotate(${mid+90}, ${p.x}, ${p.y})`} style={{userSelect:"none"}}>
                        {label ? label.name : "Prize"}
                      </text>
                    </g>
                  );
                })}
                <circle cx={cx} cy={cy} r={radius} fill="url(#shine)" />
              </svg>
            </div>
            {/* Hub */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-24 rounded-full bg-neutral-950 border border-white/10 shadow-inner flex items-center justify-center text-xs text-neutral-300">
                Super Aylana
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded bg-white/5">Balance: <b>{me?.balance ?? 0}</b></div>
          <button onClick={spin} disabled={spinning}
            className={`px-6 py-3 rounded-xl font-semibold text-white ${spinning?'bg-gray-600':'bg-emerald-600 hover:bg-emerald-700'}`}>
            {spinning ? "Aylanmoqda..." : `Aylantirish (${mode})`}
          </button>
        </div>
        <div className="text-xs text-neutral-400">
          Logged in as: <b>{me?.name}</b> (login: <b>{me?.login}</b>)
        </div>
      </div>

      {/* RIGHT: recent wins */}
      <div className="w-full lg:w-[340px]">
        <div className="text-lg font-semibold mb-3">So‘nggi yutuqlar</div>
        <div className="space-y-3">
          {wins.map(w=>(
            <div key={w.id} className="p-3 rounded-xl bg-white/5">
              <div className="text-sm"><b>{w.user}</b> — <span className="text-emerald-300">{w.prize}</span></div>
              <div className="text-xs text-neutral-400">{new Date(w.time).toLocaleTimeString()}</div>
            </div>
          ))}
          {wins.length===0 && <div className="text-sm text-neutral-400">Hozircha yutuqlar yo‘q.</div>}
        </div>
      </div>

      {/* Popup (guaranteed after stop) */}
      {popup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={()=>setPopup(null)}>
          <div className="bg-neutral-900 p-6 rounded-2xl max-w-md text-center space-y-3 shadow-xl">
            {popup.imageUrl && <img src={popup.imageUrl} alt="" className="mx-auto w-40 h-40 object-cover rounded-xl" />}
            <div className="text-lg text-white">
              <b>{popup.user}</b> siz <b>{popup.prize}</b> yutib oldingiz!
            </div>
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm text-neutral-300">Yopish</button>
          </div>
        </div>
      )}
    </div>
  );
}
