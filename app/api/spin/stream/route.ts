export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redis, REDIS_STATE_KEY, REDIS_LAST_POP_KEY, REDIS_VER_KEY } from "@/app/lib/redis";

export async function GET() {
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastVer = -1;

      const push = (event: string, data: any) => {
        controller.enqueue(enc.encode(`event: ${event}\n`));
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const timer = setInterval(async () => {
        try {
          const ver = (await redis.get<number>(REDIS_VER_KEY)) ?? 0;
          if (ver !== lastVer) {
            lastVer = ver;

            const [stateRaw, popRaw] = await Promise.all([
              redis.get<string>(REDIS_STATE_KEY),
              redis.get<string>(REDIS_LAST_POP_KEY),
            ]);
            const state = stateRaw ? JSON.parse(stateRaw) : { status: "IDLE", spinId: null };
            const popup = popRaw ? JSON.parse(popRaw) : null;

            if (state?.status === "SPINNING" && state.spinId) {
              push("SPIN_START", state); // {spinId, by, mode, startedAt}
            } else {
              push("SPIN_IDLE", {});
            }
            if (popup?.spinId) {
              push("SPIN_RESULT", { popup }); // {popup:{spinId,...}}
            }
          } else {
            push("ping", { t: Date.now() });
          }
        } catch (e) {
          push("ping", { err: String(e) });
        }
      }, 600);

      (controller as any)._close = () => clearInterval(timer);
      push("ping", { boot: Date.now() });
    },
    cancel() { try { (this as any)?._close?.(); } catch {} },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
