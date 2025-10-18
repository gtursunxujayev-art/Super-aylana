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
function deltaToCenter(i:number,count:number,currentDeg:number){const slice=360/count;const center=i*slice+slice/2;const mod=(( -center - (currentDeg%360) )%360+360)%360;return 360*8+mod;}

/* ========== Component ========== */
export default function WheelPage(){
  const [me,setMe]=useState<Me|null>(null);
  const [mode,setMode]=useState<50|100|200>(100);
  const [entries,setEntries]=useState<Entry[]>([]);
  const [wins,setWins]=useState<Win[]>([]);
  const [popup,setPopup]=useState<Popup|null>(null);

  const wheelRef=useRef<HTMLDivElement>(null);
  const rot=useRef(0);
  const ticker=useRef<any>(null);

  // Global spin state mirrors Redis
  const globalSpinId=useRef<string|null>(null);
  const banner=useRef<{by:string|null,mode:number|null}>({by:null,mode:null});
  const lastPopupKey=useRef<string>("");

  async function loadMe(){const r=await fetch("/api/me",{cache:"no-store"}); if(r.ok) setMe(await r.json());}
  async function loadEntries(m:50|100|200){const r=await fetch(`/api/wheel?mode=${m}`,{cache:"no-store"}); if(r.ok) setEntries(await r.json());}
  async function loadWins(){const r=await fetch("/api/recent-wins",{cache:"no-store"}); if(r.ok) setWins(await r.json());}

  useEffect(()=>{ loadMe(); loadWins(); },[]);
  useEffect(()=>{ loadEntries(mode); },[mode]);

  /** start/stop the continuous rotation (used while waiting for result) */
  function ensureTicker(){
    if (ticker.current || !wheelRef.current) return;
    ticker.current = setInterval(()=>{
      rot.current += 360;
      wheelRef.current!.style.transition = `transform 0.7s linear`;
      wheelRef.current!.style.transform  = `rotate(${rot.current}deg)`;
    },700);
  }
  function stopTicker(){ if (ticker.current){ clearInterval(ticker.current); ticker.current=null; } }

  /** snap all wheels to the exact winning slice */
  async function animateToPrize(prizeName:string, prizeMode?:50|100|200){
    if (prizeMode && prizeMode !== mode) { setMode(prizeMode); await loadEntries(prizeMode); }
    if (!wheelRef.current || !entries.length) return;
    const count=Math.max(8,entries.length);
    const idx=Math.max(0,entries.findIndex(e=>e.name===prizeName || (prizeName.includes("Yana") && e.kind==="another")));
    const delta=deltaToCenter(idx===-1?0:idx,count,rot.current);
    rot.current+=delta;
    wheelRef.current.style.transition=`transform 1.2s cubic-bezier(.2,.9,.2,1)`;
    wheelRef.current.style.transform =`rotate(${rot.current}deg)`;
  }

  function showPopupOnce(p:Popup){
    const key=JSON.stringify(p);
    if (key!==lastPopupKey.current){ lastPopupKey.current=key; setPopup(p); }
  }

  /* ---------- Polling: single source of truth (no cache) ---------- */
  useEffect(()=>{
    let stop=false;
    const tick=async ()=>{
      try{
        const r=await fetch("/api/spin/state",{cache:"no-store"});
        if(!r.ok) return;
        const data = await r.json();
        // support both shapes: { state, lastPopup } OR legacy {status, lastPopup}
        const state = data?.state ?? { status: data?.status, spinId: data?.spinId, by: data?.by, mode: data?.mode };
        const lastPopup = data?.lastPopup ?? data?.popup ?? null;

        if (state?.status==="SPINNING" && state.spinId){
          if (globalSpinId.current !== state.spinId){
            // NEW GLOBAL SPIN: set banner, lock mode (visual), and start smooth ticker
            globalSpinId.current = state.spinId;
            banner.current = { by: state.by ?? null, mode: state.mode ?? null };
            if (state.mode && state.mode !== mode) { setMode(state.mode); await loadEntries(state.mode); }
            ensureTicker();
          } else {
            // keep banner fresh
            banner.current = { by: state.by ?? null, mode: state.mode ?? null };
          }
        } else {
          // no active spin (could be right after popup), don’t force-stop ticker until we see popup
          if (!lastPopup) { banner.current = { by: null, mode: null }; stopTicker(); }
        }

        // result arrives?
        if (lastPopup?.spinId && lastPopup.spinId === globalSpinId.current){
          stopTicker();
          await animateToPrize(lastPopup.prize, lastPopup.mode);
          showPopupOnce(lastPopup);
          banner.current = { by: null, mode: null };
          await loadWins(); await loadMe();
        }
      }catch{}
      if (!stop) setTimeout(tick, 500);
    };
    tick();
    return ()=>{ stop=true; stopTicker(); };
  },[mode, entries.length]);

  /* ---------- SSE (faster reaction; polling still covers everything) ---------- */
  useEffect(()=>{
    const es = new EventSource("/api/spin/stream");
    es.addEventListener("SPIN_START", async (e:any)=>{
      const s = JSON.parse(e.data); // {spinId,by,mode}
      if (!s?.spinId) return;
      if (globalSpinId.current !== s.spinId){
        globalSpinId.current = s.spinId;
        banner.current = { by: s.by ?? null, mode: s.mode ?? null };
        if (s.mode && s.mode !== mode) { setMode(s.mode); await loadEntries(s.mode); }
        ensureTicker();
      } else {
        banner.current = { by: s.by ?? null, mode: s.mode ?? null };
      }
    });
    es.addEventListener("SPIN_RESULT", async (e:any)=>{
      const d = JSON.parse(e.data); // {popup:{spinId,...}}
      const p: Popup | undefined = d?.popup;
      if (!p?.spinId) return;
      if (p.spinId === globalSpinId.current){
        stopTicker();
        await animateToPrize(p.prize, p.mode);
        showPopupOnce(p);
        banner.current = { by: null, mode: null };
        await loadWins(); await loadMe();
      }
    });
    es.addEventListener("ping",()=>{});
    es.onerror = () => {};
    return ()=>{ es.close(); };
  },[mode, entries.length]);

  /* ---------- LOCAL SPIN (FIX: start ticker immediately here) ---------- */
  async function spin(){
    // Start the visual rotation immediately so it never feels stuck
    ensureTicker();
    // Show your name in the banner instantly (global state will overwrite shortly)
    if (me?.name) banner.current = { by: me.name, mode };

    const r=await fetch("/api/spin/start",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mode})
    });

    if(!r.ok){
      stopTicker(); // revert if server refused
      const j=await r.json().catch(()=>({}));
      alert(j?.error==="BUSY"?"Hozir aylanmoqda, kuting.":j?.error==="NOT_ENOUGH_COINS"?"Koin yetarli emas.":"Xatolik.");
      return;
    }

    // We intentionally do NOT snap here.
    // Everyone (including the spinner) will stop & snap when the matching popup arrives.
    // This keeps all tabs perfectly in sync.
  }

  /* ---------- Visuals ---------- */
  const size=420, cx=size/2, cy=size/2, radius=size/2-6;
  const count=Math.max(8, entries.length || 8);
  const sliceAngle=360/count;
  const colors=["#06b6d4","#f59e0b","#22c55e","#60a5fa","#f472b6","#a78bfa","#fb7185","#34d399"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_340px] gap-8 items-start">
      {/* LEFT */}
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Buttons */}
        <div className="flex gap-2">
          {[50,100,200].map(m=>(
            <button key={m}
              onClick={()=>setMode(m as 50|100|200)}
              className={`px-4 py-2 rounded font-medium ${mode===m?'bg-emerald-600 text-white':'bg-white/10 hover:bg-white/20'}`}>
              {m}
            </button>
          ))}
        </div>

        {/* FIXED BANNER SPACE (no layout jump) */}
        <div className="h-8 flex items-center">
          {banner.current.by ? (
            <div className="px-4 py-1 rounded-md bg-amber-500/15 text-amber-300 text-sm">
              <b>{banner.current.by}</b> aylantiryapti…
            </div>
          ) : null}
        </div>

        {/* Wheel */}
        <div className="relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-r-[14px] border-b-[28px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow" />
          <div className="relative w-[460px] h-[460px] rounded-full bg-neutral-900 border-4 border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden">
            <div ref={wheelRef} className="absolute inset-0 will-change-transform">
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
          <button onClick={spin} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            Aylantirish ({mode})
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

      {/* Global popup */}
      {popup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center" onClick={()=>setPopup(null)}>
          <div className="bg-neutral-900 p-6 rounded-2xl max-w-md text-center space-y-3 shadow-xl">
            {popup.imageUrl ? (<img src={popup.imageUrl} alt="" className="mx-auto w-40 h-40 object-cover rounded-xl"/>) : null}
            <div className="text-lg text-white"><b>{popup.user}</b> siz <b>{popup.prize}</b> yutib oldingiz.</div>
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm text-neutral-300">Yopish</button>
          </div>
        </div>
      )}
    </div>
  );
}
