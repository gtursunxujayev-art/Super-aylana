// app/lib/auth.ts
import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { randomBytes } from "crypto";

export type AuthUser = {
  id: string;
  login: string;
  name: string;
  tgid: string | null;
  balance: number;
  role: string;
};

function randomStr(len = 10) {
  return randomBytes(len).toString("hex").slice(0, len);
}

/**
 * Finds the current user by cookies (login/tgid).
 * If missing, will create a user:
 *  - If a TG id is available in cookies or query/header, use that
 *  - Otherwise creates a "guest-xxxx" user
 * Also (re)sets the cookies so subsequent calls work.
 */
export async function ensureUser(req: Request): Promise<AuthUser> {
  const c = cookies();

  // Try to read TGID or login from cookies first
  let tgid = c.get("tgid")?.value || null;
  let login = c.get("login")?.value || null;

  // Also allow passing TGID through header or query (for Telegram WebApp)
  const url = new URL(req.url);
  const headerTgid = (req.headers.get("x-telegram-id") || req.headers.get("x-tgid") || "").trim();
  const qTgid = (url.searchParams.get("tgid") || "").trim();
  if (!tgid && (headerTgid || qTgid)) {
    tgid = headerTgid || qTgid;
  }

  // If we have login, try by login first
  if (login) {
    const u = await prisma.user.findUnique({
      where: { login },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (u) return u;
  }

  // If we have tgid, try by tgid
  if (tgid) {
    const byTg = await prisma.user.findUnique({
      where: { tgid },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (byTg) {
      // refresh cookies
      c.set("tgid", byTg.tgid || "", { path: "/", httpOnly: false });
      c.set("login", byTg.login, { path: "/", httpOnly: false });
      return byTg;
    }

    // No user with this TG – create one
    const newUser = await prisma.user.create({
      data: {
        tgid,
        login: tgid,                 // your spec: auto-register login = tgid
        name: `user_${tgid}`,        // or use Telegram username if you have it
        password: randomStr(16),     // random password (not used)
        balance: 0,                  // or seed with initial coins if you want
      },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    c.set("tgid", newUser.tgid || "", { path: "/", httpOnly: false });
    c.set("login", newUser.login, { path: "/", httpOnly: false });
    return newUser;
  }

  // No cookies and no TG → create a guest user
  const guestLogin = `guest-${randomStr(8)}`;
  const guest = await prisma.user.create({
    data: {
      tgid: null,
      login: guestLogin,
      name: "Guest",
      password: randomStr(16),
      balance: 0, // or initial 100 if you prefer
    },
    select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
  });
  c.set("login", guest.login, { path: "/", httpOnly: false });
  return guest;
}
