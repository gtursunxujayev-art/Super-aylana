export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redis, REDIS_SPIN_CHANNEL } from "@/app/lib/redis";

/**
 * Server-Sent Events stream that relays Redis Pub/Sub messages to clients.
 * Uses the Upstash subscribe({ channel, onMessage }) signature (single-arg).
 */
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Heartbeat so proxies don’t close the connection
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
      }, 25_000);

      // Subscribe to spin events
      // Upstash v1.x signature: subscribe({ channel, onMessage })
      await redis.subscribe({
        channel: REDIS_SPIN_CHANNEL,
        onMessage: (msg: any) => {
          try {
            const eventName = msg?.type ?? "MESSAGE";
            controller.enqueue(
              encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(msg)}\n\n`)
            );
          } catch {
            // ignore malformed messages
          }
        },
      });

      // When the client disconnects, stop heartbeats and close the stream.
      // (Upstash HTTP subscriptions are stateless; there's nothing to "unsubscribe")
      // @ts-ignore
      const abortSignal: AbortSignal | undefined = (globalThis as any).request?.signal;
      const close = () => {
        clearInterval(heartbeat);
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
