export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redis, REDIS_SPIN_CHANNEL } from "@/app/lib/redis";

// Server-Sent Events stream that relays Redis Pub/Sub messages to clients
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Heartbeat to keep the connection alive on proxies
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
      }, 25000);

      // Subscribe to channel (Upstash SDK returns an async iterator)
      const sub = redis.subscribe<{ type: string; [k: string]: any }>(REDIS_SPIN_CHANNEL, (msg) => {
        controller.enqueue(encoder.encode(`event: ${msg.type}\ndata: ${JSON.stringify(msg)}\n\n`));
      });

      // On close
      // @ts-ignore - sub has an unsubscribe method at runtime
      const unsubscribe = async () => {
        clearInterval(heartbeat);
        try { await (await sub).unsubscribe(); } catch {}
        controller.close();
      };

      // If the client disconnects
      // @ts-ignore
      const abort = (globalThis as any).request?.signal;
      if (abort) abort.addEventListener("abort", unsubscribe);
    }
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
