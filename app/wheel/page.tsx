"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/** ---------- Types ---------- */
type Item = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
};

type SpinStartEvent = {
  type: "SPIN_START";
  spinId: string;
  by: string;    // username (or login)
  mode: 50 | 100 | 200;
  startedAt: number;
};

type SpinResultEvent = {
  type: "SPIN_RESULT";
  spinId: string;
  by: string;
  mode: 50 | 100 | 200;
  label: string;
  image?: string | null;
  newBalance?: number;
  /** optional helpers from server; if absent, we compute */
  angleDeg?: number;
  segmentIndex?: number;
};

type WinFeed = { who: string; prize: string; at: string };

/** ---------- Constants ---------- */
const COLORS = [
  "#06b6d4", // cyan-500
  "#f59e0b", // amber-500
  "#22c55e", // green-500
  "#60a5fa", // blue-400
  "#f472b6", // pink-400
  "#a78bfa", // violet-400
  "#fb7185", // rose-400
  "#34d399", // emerald-400
];

const ROTATE_MS = 10000; // 10s total spin time

/** ---------- Helpers ---------- */
function slicePath(cx: number, cy: number, rOuter: number, rInner: number, startDeg: number, endDeg: number) {
  // build an annular sector path (outer arc + inner arc) for SVG
  const toRad = (d: number) => (d * Math.PI) / 180;
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  const sx = cx + rOuter * Math.sin(toRad(startDeg));
  const sy = cy - rOuter * Math.cos(toRad(startDeg));
  const ex = cx + rOuter * Math.sin(toRad(endDeg));
  const ey = cy - rOuter * Math.cos(toRad(endDeg));

  const isx = cx + rInner * Math.sin(toRad(endDeg));
  const isy = cy - rInner * Math.cos(toRad(endDeg));
  const iex = cx + rInner * Math.sin(toRad(startDeg));
  const iey = cy - rInner * Math.cos(toRad(startDeg));

  return [
    `M ${sx} ${sy}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${ex} ${ey}`, // outer arc CW
    `L ${isx} ${isy}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${iex} ${iey}`, // inner arc CCW
    "Z",
  ].join(" ");
}

function centerAngleDeg(index: number, total: number) {
  const sweep = 360 / total;
  const start = index * sweep;
  const end = start + sweep;
  return (start + end) / 2;
}

/** ---------- Component ---------- */
export default function WheelPage() {
  const [mode, setMode] = useState<50 | 100 | 200>(100);
  const [items, setItems] = useState<Item[]>([]);
  const [balance, setBalance] = useState(0);

  const [spinning, setSpinning] = useState(false);
  const [spinnerName, setSpinnerName] = useState<string | null>(null); // "Username aylantiryapti"
  const [currentRotation, setCurrentRotation] = useState(0); // degrees, CSS rotate
  const [targetRotation, setTargetRotation] = useState<number | null>(null);

  const [feed, setFeed] = useState<WinFeed[]>([]);
  const [modal, setModal] = useState<null | { who: string; prize: string; image?: string | null }>(null);

  const wheelRef = useRef<SVGSVGElement>(null);

  /** load current user (balance) */
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        if (data?.balance != null) setBalance(data.balance);
      } catch {
        // ignore
      }
    };
    run();
  }, []);

  /** load items for selected mode */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/items?mode=${mode}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Item[];
          if (!ignore) setItems(data && data.length ? data : fallbackItems(mode));
        } else {
          if (!ignore) setItems(fallbackItems(mode));
        }
      } catch {
        if (!ignore) setItems(fallbackItems(mode));
      }
    })();
    return () => {
      ignore = true;
    };
  }, [mode]);

  /** subscribe to SSE */
  useEffect(() => {
    const es = new EventSource("/api/spin/state");

    const onStart = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as SpinStartEvent;
        setSpinnerName(payload.by);
      } catch {}
      setSpinning(true);
      setTargetRotation(null);
    };
    const onResult = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as SpinResultEvent;

        // update balance if provided
        if (typeof payload.newBalance === "number") setBalance(payload.newBalance);

        // compute target rotation if server didn’t provide angleDeg
        let finalAngle = payload.angleDeg ?? null;

        if (finalAngle == null) {
          const total = items.length || 8;
          let idx = -1;

          if (typeof payload.segmentIndex === "number") {
            idx = payload.segmentIndex % total;
          } else {
            const byName = items.findIndex((it) => normalize(it.name) === normalize(payload.label));
            if (byName >= 0) idx = byName;
          }

          // If still unknown, best-effort: do not change rotation (will just stop where it is)
          if (idx >= 0) {
            // We want the center of that slice under the fixed pointer at the top.
            // Our SVG “0°” is at 12 o’clock, increasing clockwise, and we rotate the whole wheel CW.
            // So the wheel rotation that places slice center under pointer is: -(centerAngle) + k*360
            const center = centerAngleDeg(idx, total);
            finalAngle = -center; // base alignment
          }
        }

        // If we got any target, add multiple full turns to look nice
        if (finalAngle != null) {
          const turns = 5; // number of full spins before landing
          const target = finalAngle - turns * 360; // negative to rotate CW visually
          setTargetRotation(target);
        }

        // add to feed & show modal
        const who = payload.by;
        const prize = payload.label;
        const at = new Date().toLocaleTimeString();
        setFeed((f) => [{ who, prize, at }, ...f.slice(0, 9)]);
        setModal({ who, prize, image: payload.image });

        // done state
        setSpinning(false);
        setSpinnerName(null);
      } catch (err) {
        setSpinning(false);
        setSpinnerName(null);
      }
    };

    es.addEventListener("SPIN_START", onStart);
    es.addEventListener("SPIN_RESULT", onResult);
    es.onerror = () => {
      // keep subscribed; server may recycle connection
    };

    return () => {
      es.removeEventListener("SPIN_START", onStart);
      es.removeEventListener("SPIN_RESULT", onResult);
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]); // re-bind if items list (and thus indexing) changes

  /** perform CSS rotation animation to targetRotation */
  useEffect(() => {
    const node = wheelRef.current;
    if (!node) return;

    // If spinning started and there’s no result yet → do a slow “free spin”
    if (spinning && targetRotation == null) {
      node.style.transition = `transform ${ROTATE_MS}ms cubic-bezier(0.12, 0.01, 0, 1)`;
      const freeSpinTarget = currentRotation - 360 * 4; // 4 free turns CW
      node.style.transform = `rotate(${freeSpinTarget}deg)`;
      setCurrentRotation(freeSpinTarget);
      return;
    }

    // If result arrived with a target angle → animate to that final rotation
    if (targetRotation != null) {
      node.style.transition = `transform ${ROTATE_MS}ms cubic-bezier(0.12, 0.01, 0, 1)`;
      node.style.transform = `rotate(${targetRotation}deg)`;
      setCurrentRotation(targetRotation);
      return;
    }
  }, [spinning, targetRotation]); // eslint-disable-line react-hooks/exhaustive-deps

  /** start spin */
  async function onSpin() {
    if (spinning) return;

    try {
      setSpinning(true);
      setModal(null);

      const res = await fetch("/api/spin/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = [data?.error, data?.details].filter(Boolean).join(": ") || `HTTP_${res.status}`;
        alert(msg); // keep it simple for now
        setSpinning(false);
        return;
      }

      // Optimistic deduction; server already decremented too
      setBalance((b) => Math.max(0, b - mode));
    } catch (e: any) {
      alert(`CLIENT_ERROR: ${String(e?.message || e)}`);
      setSpinning(false);
    }
  }

  /** derived geometry */
  const svg = { size: 520, cx: 260, cy: 260, rOuter: 250, rInner: 92 };
  const slices = useMemo(() => {
    const total = Math.max(1, items.length || 8);
    const sweep = 360 / total;
    return new Array(total).fill(0).map((_, i) => {
      const start = i * sweep;
      const end = start + sweep;
      const color = COLORS[i % COLORS.length];
      const textAngle = centerAngleDeg(i, total);
      return { i, start, end, color, textAngle };
    });
  }, [items]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* LEFT */}
      <div className="flex flex-col items-center gap-4">
        {/* Mode buttons */}
        <div className="flex gap-2">
          {[50, 100, 200].map((m) => (
            <button
              key={m}
              onClick={() => !spinning && setMode(m as 50 | 100 | 200)}
              className={`px-4 py-2 rounded ${
                mode === m ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-200"
              }`}
              disabled={spinning}
            >
              {m}
            </button>
          ))}
        </div>

        {/* WHO IS SPINNING */}
        {spinnerName && (
          <div className="mt-1 px-3 py-1 rounded bg-amber-500/15 text-amber-300 font-medium">
            {spinnerName} aylantiryapti…
          </div>
        )}

        {/* Wheel with pointer */}
        <div className="relative w-[520px] h-[520px]">
          {/* pointer */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-20">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[18px] border-l-transparent border-r-transparent border-b-yellow-400" />
          </div>

          {/* rim shadow */}
          <div className="absolute inset-0 rounded-full bg-black/20" />

          {/* SVG wheel */}
          <svg
            ref={wheelRef}
            width={svg.size}
            height={svg.size}
            viewBox={`0 0 ${svg.size} ${svg.size}`}
            className="relative z-10 block rounded-full border-[10px] border-zinc-700 bg-zinc-900"
            style={{ transform: `rotate(${currentRotation}deg)` }}
          >
            {/* slices */}
            {slices.map((s, idx) => (
              <path
                key={idx}
                d={slicePath(svg.cx, svg.cy, svg.rOuter, svg.rInner, s.start, s.end)}
                fill={s.color}
                stroke="#1f2937" // gray-800 border between slices
                strokeWidth={2}
              />
            ))}

            {/* labels (follow slice centers) */}
            {slices.map((s, idx) => {
              const label = items[idx]?.name ?? "Another spin";
              const angle = s.textAngle;
              const rx = svg.cx + (svg.rInner + (svg.rOuter - svg.rInner) * 0.58) * Math.sin((angle * Math.PI) / 180);
              const ry = svg.cy - (svg.rInner + (svg.rOuter - svg.rInner) * 0.58) * Math.cos((angle * Math.PI) / 180);
              return (
                <g key={`t${idx}`} transform={`rotate(${angle}, ${rx}, ${ry})`}>
                  <text
                    x={rx}
                    y={ry}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={14}
                    fill="#ffffff"
                    opacity={0.9}
                    style={{ userSelect: "none" }}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* center cap */}
            <circle cx={svg.cx} cy={svg.cy} r={svg.rInner - 10} fill="#0b0f14" />
            <text
              x={svg.cx}
              y={svg.cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={14}
              fill="#fff"
              opacity={0.9}
            >
              Super Aylana
            </text>
          </svg>
        </div>

        {/* Balance + Spin button */}
        <div className="flex gap-4 items-center mt-2">
          <div className="px-4 py-2 rounded bg-zinc-800 text-zinc-100">
            Balance: <strong>{balance}</strong>
          </div>
          <button
            onClick={onSpin}
            disabled={spinning}
            className={`px-5 py-2 rounded ${
              spinning ? "bg-zinc-700 text-zinc-300" : "bg-emerald-600 text-white hover:bg-emerald-500"
            }`}
          >
            {spinning ? "Aylanmoqda..." : `Aylantirish (${mode})`}
          </button>
        </div>
      </div>

      {/* RIGHT – Last 10 wins */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-100">So‘nggi yutuqlar</h3>
        {feed.length === 0 ? (
          <div className="text-sm text-zinc-400">Hozircha yutuqlar yo‘q.</div>
        ) : (
          <ul className="space-y-2">
            {feed.map((f, i) => (
              <li key={i} className="bg-zinc-800 text-zinc-100 rounded px-3 py-2">
                <span className="font-medium">{f.who}</span> — {f.prize}
                <span className="text-xs text-zinc-400 ml-2">{f.at}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* WIN MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 text-zinc-100 rounded-xl p-5 w-[min(92vw,520px)] shadow-lg">
            <div className="text-lg font-semibold mb-3">
              <span className="font-bold">{modal.who}</span> siz <span className="font-bold">{modal.prize}</span> yutib
              oldingiz.
            </div>
            {modal.image && (
              <img
                src={modal.image}
                alt={modal.prize}
                className="w-full max-h-[240px] object-contain rounded-md mb-4"
              />
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ---------- Fallback items if /api/items isn't ready ---------- */
function fallbackItems(mode: 50 | 100 | 200): Item[] {
  const names = ["Another spin", "xfg", "gdgdf", "jhgfhj", "hfdhft", "gjgkjh", "gjdfdf", "xg"];
  return names.map((n, i) => ({
    id: `${mode}-${i}`,
    name: n,
    price: mode,
  }));
}

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}
