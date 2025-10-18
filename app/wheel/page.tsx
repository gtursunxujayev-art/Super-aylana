'use client';

import { useEffect, useRef, useState } from "react";

/* ---------- Types ---------- */
type Me = {
  id: string;
  name: string;
  balance: number;
  role: string;
  login?: string;
};

type Popup = {
  user: string;
  prize: string;
  imageUrl?: string | null;
  mode?: 50 | 100 | 200;
};

type Entry = {
  id: string | null;
  name: string;
  imageUrl?: string | null;
  weight: number;
  kind: "item" | "another";
};

type Win = { id: string; user: string; prize: string; imageUrl?: string | null; time: string };

/* ---------- Geometry helpers for the SVG wheel ---------- */
function deg2rad(d: number) { return (d * Math.PI) / 180; }
function polar(cx: number, cy: number, r: number, aDeg: number) {
  const a = deg2rad(aDeg);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, start), e = polar(cx, cy, r, end);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

/**
 * Compute how much to rotate from current angle so slice index i ends centered at the pointer (top).
 * We draw slices with startAngle = i*slice - 90, so the center for index i is (-90 + i*slice + slice/2).
 * To put that at the top, we want final orientation where center == 0 deg relative to screen top.
 * delta ≡ -center - currentDeg (mod 360). We add 8 spins for drama.
 */
function deltaToCenter(i: number, count: number, currentDeg: number) {
  const slice = 360 / count;
  const center = i * slice + slice / 2;
  const mod = ((-center - (currentDeg % 360)) % 360 + 360) % 360;
  return 360 * 8 + mod;
}

/* ========== Component ========== */
export default function WheelPage() {
  /* ----- state ----- */
  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<50 | 100 | 200>(100);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [wins, setWins] = useState<Win[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [someoneSpinning, setSomeoneSpinning] = useState<{ by: string; mode: number } | null>(null);
  const [popup, setPopup] = useState<Popup | null>(null);

  /* ----- refs (imperative) ----- */
  const wheelRef = useRef<HTMLDivElement>(null);
  const rot = useRef<number>(0);                  // cumulative rotation
  const fallTimer = useRef<any>(null);            // fallback popup timer
  const extTicker = useRef<any>(null);            // continuous rotation ticker (when someone else is spinning)
  const viewLocked = useRef<boolean>(false);      // lock buttons while someone else is spinning
  const lastPopupHash = useRef<string>("");       // de-dupe popups

  /* ----- loaders ----- */
  async function loadMe() {
    const r = await fetch("/api/me");
    if (r.ok) setMe(await r.json());
  }
  async function loadEntries(m: 50 | 100 | 200) {
    const r = await fetch(`/api/wheel?mode=${m}`, { cache: "no-store" });
    if (r.ok) setEntries(await r.json());
  }
  async function loadWins() {
    const r = await fetch("/api/feed/recent-wins", { cache: "no-store" });
    if (r.ok) setWins(await r.json());
  }

  useEffect(() => { loadMe(); loadWins(); }, []);
  useEffect(() => { if (!viewLocked.current) loadEntries(mode); }, [mode]);

  /* ----- popup de-dupe ----- */
  function showPopupOnce(p: Popup) {
    const hash = JSON.stringify(p);
    if (hash !== lastPopupHash.current) {
      lastPopupHash.current = hash;
      setPopup(p);
    }
  }

  /* ----- Polling drives banners + popup for all clients (reliable everywhere) ----- */
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/spin/state", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();

        if (j?.status === "SPINNING" && j?.by) {
          viewLocked.current = true;
          // sync wheel mode to external spinner
          if (j.mode && j.mode !== mode) {
            setMode(j.mode);
            await loadEntries(j.mode);
          }
          setSomeoneSpinning({ by: j.by, mode: j.mode ?? mode });

          // start continuous rotation if not spinning locally
          if (!spinning && !extTicker.current && wheelRef.current) {
            extTicker.current = setInterval(() => {
              rot.current += 360;
              wheelRef.current!.style.transition = `transform 0.7s linear`;
              wheelRef.current!.style.transform = `rotate(${rot.current}deg)`;
            }, 700);
          }
        } else {
          setSomeoneSpinning(null);
        }

        if (j?.lastPopup) showPopupOnce(j.lastPopup);
      } catch { /* ignore */ }
      if (!stopped) setTimeout(tick, 600); // steady cadence, avoids setInterval drift
    };
    tick();
    return () => {
      stopped = true;
      if (extTicker.current) { clearInterval(extTicker.current); extTicker.current = null; }
    };
  }, [mode, spinning]);

  /* ----- SSE (optional enhancement; polling already covers the UX) ----- */
  useEffect(() => {
    const es = new EventSource("/api/spin/stream");
    es.addEventListener("SPIN_START", async (e: any) => {
      const data = JSON.parse(e.data);
      viewLocked.current = true;
      if (data?.mode && data.mode !== mode) {
        setMode(data.mode);
        await loadEntries(data.mode);
      }
      setSomeoneSpinning({ by: data.by, mode: data.mode });

      if (!spinning && !extTicker.current && wheelRef.current) {
        extTicker.current = setInterval(() => {
          rot.current += 360;
          wheelRef.current!.style.transition = `transform 0.7s linear`;
          wheelRef.current!.style.transform = `rotate(${rot.current}deg)`;
        }, 700);
      }
    });
    es.addEventListener("SPIN_RESULT", async (e: any) => {
      const data = JSON.parse(e.data);

      // stop continuous rotation
      if (extTicker.current) { clearInterval(extTicker.current); extTicker.current = null; }

      // snap to the exact winning slice for viewers
      const prizeName: string | undefined = data?.popup?.prize?.toString();
      const prizeMode: 50 | 100 | 200 | undefined = data?.popup?.mode;
      if (prizeMode && prizeMode !== mode) { setMode(prizeMode); await loadEntries(prizeMode); }
      if (prizeName && wheelRef.current && entries.length) {
        const i = Math.max(
          0,
          entries.findIndex(e => e.name === prizeName || (prizeName.includes("Yana") && e.kind === "another"))
        );
        const count = Math.max(entries.length, 8);
        const delta = deltaToCenter(i === -1 ? 0 : i, count, rot.current);
        rot.current += delta;
        wheelRef.current.style.transition = `transform 1.2s cubic-bezier(.2,.9,.2,1)`;
        wheelRef.current.style.transform = `rotate(${rot.current}deg)`;
      }

      showPopupOnce(data.popup);
      loadWins(); loadMe();
      viewLocked.current = false;
      setSomeoneSpinning(null);
    });
    es.addEventListener("ping", () => {});
    es.onerror = () => {}; // silent retries
    return () => { es.close(); };
  }, [entries, mode, spinning]);

  /* ----- Local spin ----- */
  async function spin() {
    if (spinning) return;
    setSpinning(true);
    viewLocked.current = true;

    const r = await fetch("/api/spin/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(
        j?.error === "BUSY" ? "Hozir aylanmoqda, kuting."
          : j?.error === "NOT_ENOUGH_COINS" ? "Koin yetarli emas."
          : "Xatolik."
      );
      setSpinning(false);
      viewLocked.current = false;
      return;
    }

    const j = await r.json();

    // aim precisely for spinner himself
    if (wheelRef.current && entries.length) {
      const count = Math.max(8, entries.length);
      const name = String(j.result.name);
      const idx = Math.max(
        0,
        entries.findIndex(e => e.name === name || (j.result.type === "another" && e.kind === "another"))
      );
      const delta = deltaToCenter(idx === -1 ? 0 : idx, count, rot.current);
      rot.current += delta;
      wheelRef.current.style.transition = `transform ${j.spinMs / 1000}s cubic-bezier(.2,.9,.2,1)`;
      wheelRef.current.style.transform = `rotate(${rot.current}deg)`;
    }

    // fallback popup (in case SSE/polling is late)
    if (fallTimer.current) clearTimeout(fallTimer.current);
    fallTimer.current = setTimeout(() => {
      showPopupOnce({
        user: me?.name ?? "Siz",
        prize: j.result.type === "another" ? "Yana bir bor aylantirish" : j.result.name,
        imageUrl: j.result.imageUrl,
        mode,
      });
      loadWins(); loadMe();
      fallTimer.current = null;
      viewLocked.current = false;
    }, j.spinMs + 200);

    setTimeout(() => { setSpinning(false); }, j.spinMs);
  }

  /* ----- Wheel visual ----- */
  const size = 420, cx = size / 2, cy = size / 2, radius = size / 2 - 6;
  const count = Math.max(8, entries.length || 8);
  const sliceAngle = 360 / count;
  const colors = ["#06b6d4", "#f59e0b", "#22c55e", "#60a5fa", "#f472b6", "#a78bfa", "#fb7185", "#34d399"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_320px] gap-6 items-start">
      {/* LEFT column */}
      <div className="flex flex-col items-center gap-4">
        {someoneSpinning && (
          <div className="px-3 py-2 rounded bg-amber-600/20 text-amber-300 text-sm">
            Hozir <b>{someoneSpinning.by}</b> {someoneSpinning.mode} bilan aylantirmoqda…
          </div>
        )}

        <div className="flex gap-2">
          {[50, 100, 200].map((m) => (
            <button
              key={m}
              disabled={viewLocked.current}
              onClick={() => !viewLocked.current && setMode(m as 50 | 100 | 200)}
              className={`px-4 py-2 rounded font-medium ${mode === m ? "bg-emerald-600 text-white" : "bg-white/10 hover:bg-white/20"} ${viewLocked.current ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="relative">
          {/* Pointer */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-r-[14px] border-b-[28px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow" />
          {/* Wheel frame */}
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

                {Array.from({ length: count }).map((_, i) => {
                  const label = entries[i % (entries.length || 1)];
                  const start = i * sliceAngle - 90, end = start + sliceAngle;
                  const path = arcPath(cx, cy, radius, start, end);
                  const mid = (start + end) / 2;
                  const p = polar(cx, cy, radius * 0.62, mid);
                  const fill = colors[i % colors.length];
                  return (
                    <g key={i}>
                      <path d={path} fill={fill} stroke="#0a0a0a" strokeWidth={2} />
                      <text
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={12}
                        className="fill-white"
                        transform={`rotate(${mid + 90}, ${p.x}, ${p.y})`}
                        style={{ userSelect: "none" }}
                      >
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
          <div className="px-4 py-2 rounded bg-white/5">
            Balance: <b>{me?.balance ?? 0}</b>
          </div>
          <button
            disabled={spinning || viewLocked.current}
            onClick={spin}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold"
          >
            {spinning ? "Aylanyapti..." : `Spin (${mode})`}
          </button>
        </div>
        <div className="text-xs text-neutral-400">
          Logged in as: <b>{me?.name}</b> (login: <b>{me?.login}</b>)
        </div>
      </div>

      {/* RIGHT: Recent wins */}
      <div className="w-full lg:w-[320px]">
        <div className="text-lg font-semibold mb-3">So‘nggi yutuqlar</div>
        <div className="space-y-3">
          {wins.map((w) => (
            <div key={w.id} className="p-3 rounded-xl bg-white/5">
              <div className="text-sm">
                <b>{w.user}</b> — <span className="text-emerald-300">{w.prize}</span>
              </div>
              <div className="text-xs text-neutral-400">{new Date(w.time).toLocaleTimeString()}</div>
            </div>
          ))}
          {wins.length === 0 && <div className="text-sm text-neutral-400">Hozircha yutuqlar yo‘q.</div>}
        </div>
      </div>

      {/* POPUP */}
      {popup && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center"
          onClick={() => setPopup(null)}
        >
          <div className="bg-neutral-900 p-6 rounded-2xl max-w-md text-center space-y-3 shadow-xl">
            {popup.imageUrl ? (
              <img src={popup.imageUrl} alt="" className="mx-auto w-40 h-40 object-cover rounded-xl" />
            ) : null}
            <div className="text-lg text-white">
              <b>{popup.user}</b> siz <b>{popup.prize}</b> yutib oldingiz.
            </div>
            <button
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm text-neutral-300"
              onClick={() => setPopup(null)}
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
