// app/api/users/list/route.ts
export const runtime = "nodejs"; // Prisma requires the Node runtime (NOT edge)

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * Returns top users with balances.
 * Works with your model:
 * model User {
 *   id        String   @id @default(cuid())
 *   tgid      String   @unique
 *   login     String   @unique
 *   name      String
 *   password  String
 *   role      Role     @default(USER)
 *   balance   Int      @default(0)
 *   createdAt DateTime @default(now())
 *   updatedAt DateTime @updatedAt
 * }
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        login: true,
        tgid: true,
        balance: true,
        role: true,
      },
      orderBy: [{ balance: "desc" }, { name: "asc" }],
      take: 50,
    });

    return NextResponse.json(users, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    // Don’t crash the page if DB is unreachable; log and return an empty list.
    console.error("[/api/users/list] failed:", e);
    return NextResponse.json([], {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
