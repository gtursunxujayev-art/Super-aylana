import { NextResponse } from "next/server";
import { redis, REDIS_STATE_KEY, REDIS_LAST_POP_KEY } from "@/app/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const stateRaw = await redis.get<string>(REDIS_STATE_KEY);
  const last = await redis.get<string>(REDIS_LAST_POP_KEY);
  return NextResponse.json({
    state: stateRaw ? JSON.parse(stateRaw) : { status: "IDLE" },
    lastPopup: last ? JSON.parse(last) : null
  });
}
