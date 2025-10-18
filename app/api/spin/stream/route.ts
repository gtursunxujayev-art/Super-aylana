export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redis, REDIS_SPIN_CHANNEL } from "@/app/lib/redis";

/**
 * SSE stream that relays Redis Pub/Sub messages to all clients.
 * Uses the async-iterator API: const sub = await redis.subscribe([...]);
 * for await (const { message } of sub) { ... }
 */
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Keep-alive heartbeat (important for proxies)
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
      }, 25_000);

      // Subscribe to the spin channel
      const sub = await redis.subscribe([REDIS_SPIN_CHANNEL]);

      // Pump messages into the SSE stream
      (async () => {
        try {
          // Each message is the JSON string published by /api/spin/start
          for await (const { message } of sub) {
            let msg: any;
            try {
              msg = typeof message === "string" ? JSON.parse(message) : message;
            } catch {
              continue; // ignore bad message
            }
            const eventName = msg?.type ?? "MESSAGE";
            controller.enqueue(
              encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(msg)}\n\n`)
            );
          }
        } catch {
          // iterator closed or aborted
        } finally {
          clearInterval(heartbeat);
          try { controller.close(); } catch {}
        }
      })();
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
