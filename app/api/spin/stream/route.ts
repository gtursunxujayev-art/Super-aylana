export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redis, REDIS_STATE_KEY, REDIS_LAST_POP_KEY } from "@/app/lib/redis";

/**
 * SSE stream using lightweight Redis polling (no Pub/Sub).
 * Emits:
 *  - event: SPIN_START  data: { by, mode, startedAt }
 *  - event: SPIN_RESULT data: { popup: { user, prize, imageUrl } }
 * Plus a heartbeat "ping" every 25s.
 */
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Heartbeat so proxies don't close the connection
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
      }, 25_000);

      // Track last seen values to avoid duplicate events
      let lastStateRaw: string | null = null;
      let lastPopRaw: string | null = null;

      // Helper: emit
      const emit = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Initial check + emit current state (if spinning)
      try {
        const [s0, p0] = await Promise.all([
          redis.get<string>(REDIS_STATE_KEY),
          redis.get<string>(REDIS_LAST_POP_KEY),
        ]);
        lastStateRaw = s0 ?? null;
        lastPopRaw = p0 ?? null;

        if (s0) {
          try {
            const st = JSON.parse(s0);
            if (st?.status === "SPINNING") {
              emit("SPIN_START", { by: st.by, mode: st.mode, startedAt: st.startedAt ?? Date.now() });
            }
          } catch { /* ignore */ }
        }
        // We don't emit last popup immediately to prevent re-showing older wins on connect.
      } catch { /* ignore */ }

      // Poll every second
      const tick = setInterval(async () => {
        try {
          const [sRaw, pRaw] = await Promise.all([
            redis.get<string>(REDIS_STATE_KEY),
            redis.get<string>(REDIS_LAST_POP_KEY),
          ]);

          // State change → SPIN_START
          if (sRaw && sRaw !== lastStateRaw) {
            lastStateRaw = sRaw;
            try {
              const st = JSON.parse(sRaw);
              if (st?.status === "SPINNING") {
                emit("SPIN_START", { by: st.by, mode: st.mode, startedAt: st.startedAt ?? Date.now() });
              }
            } catch { /* ignore */ }
          }

          // New popup → SPIN_RESULT
          if (pRaw && pRaw !== lastPopRaw) {
            lastPopRaw = pRaw;
            try {
              const popup = JSON.parse(pRaw);
              emit("SPIN_RESULT", { popup });
            } catch { /* ignore */ }
          }
        } catch {
          // If Redis hiccups, just keep the stream alive; next tick will recover.
        }
      }, 1000);

      // Close handlers
      // @ts-ignore - Next.js sets request on globalThis
      const abortSignal: AbortSignal | undefined = (globalThis as any).request?.signal;
      const close = () => {
        clearInterval(heartbeat);
        clearInterval(tick);
        try { controller.close(); } catch {}
      };
      if (abortSignal) abortSignal.addEventListener("abort", close);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
