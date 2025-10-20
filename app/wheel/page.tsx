// app/wheel/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  name: string;
  price: number;
};

type WinFeed = { who: string; prize: string; at: string };

export default function WheelPage() {
  const [mode, setMode] = useState<50 | 100 | 200>(100);
  const [balance, setBalance] = useState<number>(0);
  const [spinning, setSpinning] = useState(false);
  const [feed, setFeed] = useState<WinFeed[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const circleRef = useRef<HTMLDivElement>(null);

  // Fetch me
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        if (data?.balance != null) setBalance(data.balance);
      } catch {}
    };
    run();
  }, []);

  // Subscribe to server-sent events (start/result)
  useEffect(() => {
    const ev = new EventSource("/api/spin/state");
    ev.addEventListener("SPIN_START", () => {
      setSpinning(true);
      setMessage(null);
    });
    ev.addEventListener("SPIN_RESULT", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        // Update balance if server sends it (optional)
        if (typeof payload.newBalance === "number") {
          setBalance(payload.newBalance);
        }
        // Add to feed
        setFeed((f) => [
          { who: payload.by, prize: payload.label, at: new Date().toLocaleTimeString() },
          ...f.slice(0, 9),
        ]);
      } catch {}
      setSpinning(false);
    });
    ev.onerror = () => {
      // keep the UI resilient
    };
    return () => ev.close();
  }, []);

  // Fake wheel transform (your existing drawing/animation)
  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.style.transition = spinning ? "transform 10s cubic-bezier(0.12, 0.01, 0, 1)" : "none";
    if (spinning) {
      // spin to a large angle; the server will publish the final result angle too if you implemented it
      const finalAngle = 360 * 10 + Math.floor(Math.random() * 360);
      circleRef.current.style.transform = `rotate(${finalAngle}deg)`;
    } else {
      circleRef.current.style.transform = `rotate(0deg)`;
    }
  }, [spinning]);

  async function startSpin() {
    if (spinning) return;

    try {
      setMessage(null);
      setSpinning(true);

      const res = await fetch("/api/spin/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const text = [data?.error, data?.details].filter(Boolean).join(": ");
        alert(text || `HTTP_${res.status}`);
        console.error("spin/start failed", data);
        setSpinning(false);
        return;
      }

      const ok = await res.json();
      if (!ok?.ok) {
        alert("UNEXPECTED_RESPONSE");
        setSpinning(false);
      } else {
        // Deduct coins immediately on client for better UX; server already decremented too
        setBalance((b) => Math.max(0, b - mode));
      }
    } catch (e: any) {
      alert(`CLIENT_ERROR: ${String(e?.message || e)}`);
      setSpinning(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* LEFT – wheel */}
      <div className="flex flex-col items-center gap-4">
        {/* mode */}
        <div className="flex gap-2 mb-2">
          {[50, 100, 200].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m as 50 | 100 | 200)}
              className={`px-4 py-2 rounded ${mode === m ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-200"}`}
              disabled={spinning}
            >
              {m}
            </button>
          ))}
        </div>

        {/* pointer label space */}
        {message && (
          <div className="text-amber-400 font-medium">{message}</div>
        )}

        {/* wheel */}
        <div className="relative w-[520px] h-[520px]">
          {/* top pointer */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-20">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-yellow-400" />
          </div>

          {/* circle */}
          <div
            ref={circleRef}
            className="absolute inset-0 rounded-full border-[10px] border-zinc-700 bg-zinc-900"
          >
            {/* You can keep your existing slice drawing here */}
          </div>
        </div>

        {/* bottom controls */}
        <div className="flex gap-4 items-center mt-2">
          <div className="px-4 py-2 rounded bg-zinc-800 text-zinc-100">
            Balance: <strong>{balance}</strong>
          </div>
          <button
            onClick={startSpin}
            disabled={spinning}
            className={`px-5 py-2 rounded ${spinning ? "bg-zinc-700 text-zinc-300" : "bg-emerald-600 text-white"}`}
          >
            {spinning ? "Aylanmoqda..." : `Aylantirish (${mode})`}
          </button>
        </div>
      </div>

      {/* RIGHT – last 10 wins (if you already had a better UI, keep it) */}
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
    </div>
  );
}
