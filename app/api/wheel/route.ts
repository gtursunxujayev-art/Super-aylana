export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildWheel } from "@/app/lib/wheel";

/**
 * GET /api/wheel?mode=50|100|200
 * Returns the wheel entries for the selected mode.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const m = Number(url.searchParams.get("mode") ?? 100);
  const mode = (m === 50 || m === 100 || m === 200) ? (m as 50 | 100 | 200) : 100;

  const entries = await buildWheel(mode);

  return new NextResponse(
    JSON.stringify(
      entries.map(e => ({
        id: e.id ?? null,
        name: e.name,
        imageUrl: e.imageUrl ?? null,
        weight: e.weight,
        kind: e.kind as "item" | "another",
      }))
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    }
  );
}
