export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { buildWheel } from "@/app/lib/wheel";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = Number(searchParams.get("mode") ?? "100");
  if (![50, 100, 200].includes(mode))
    return NextResponse.json({ error: "bad mode" }, { status: 400 });

  const entries = await buildWheel(mode as 50 | 100 | 200);
  // Only expose what's needed to render
  return NextResponse.json(
    entries.map((e) => ({
      id: e.id ?? null,
      name: e.kind === "another" ? "Another spin" : e.name,
      imageUrl: e.imageUrl ?? null,
      weight: e.weight,
      kind: e.kind,
    }))
  );
}
