export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redis, REDIS_STATE_KEY, REDIS_LAST_POP_KEY, REDIS_VER_KEY } from "@/app/lib/redis";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastVer = -1;
      const write = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send an initial ping so the connection is considered "open"
      write("ping", { t: Date.now() });

      const interval = setInterval(async () => {
        try {
          const ver = (await redis.get<number>(REDIS_VER_KEY)) ?? 0;
          if (ver !== lastVer) {
            lastVer = ver;

            const [stateRaw, popRaw] = await Promise.all([
              redis.get<string>(REDIS_STATE_KEY),
              redis.get<string>(REDIS_LAST_POP_KEY),
            ]);

            const state = stateRaw ? JSON.parse(stateRaw) : { status: "IDLE" };
            const popup = popRaw ? JSON.parse(popRaw) : null;

            if (state?.status === "SPINNING") {
              write("SPIN_START", { by: state.by, mode: state.mode, startedAt: state.startedAt });
            } else {
              write("SPIN_IDLE", {});
            }

            if (popup) {
              write("SPIN_RESULT", { popup });
            }
          } else {
            write("ping", { t: Date.now() });
          }
        } catch (e) {
          write("ping", { err: String(e) });
        }
      }, 700);

      const closer = () => clearInterval(interval);
      // @ts-ignore
      controller._closer = closer;
    },
    cancel() {
      // @ts-ignore
      if (typeof (this as any)?._closer === "function") (this as any)._closer();
    },
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
