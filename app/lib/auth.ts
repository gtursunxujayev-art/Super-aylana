// app/lib/auth.ts
// Unified auth helpers used by API routes (admin, items, store, auth flows, etc.)
// IMPORTANT: Any route calling these functions must run on Node runtime (not Edge).

import { cookies, headers } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { randomBytes } from "crypto";

export type SessionUser = {
  id: string;
  login: string;
  name: string;
  tgid: string;        // <-- non-null, matches your Prisma model
  balance: number;
  role: "USER" | "ADMIN";
};

function rand(n = 10) {
  return randomBytes(n).toString("hex").slice(0, n);
}

/** cookie helpers */
function setCookie(key: string, value: string) {
  cookies().set(key, value, { httpOnly: false, sameSite: "lax", path: "/" });
}
function delCookie(key: string) {
  cookies().set(key, "", { path: "/", maxAge: 0 });
}

/** Try to read login / tgid from cookies, headers, or query */
function extractIds(req?: Request) {
  const c = cookies();
  const h = headers();
  const url = req ? new URL(req.url) : null;

  const loginRaw =
    c.get("login")?.value ||
    h.get("x-login") ||
    (url ? url.searchParams.get("login") : "") ||
    "";
  const tgidRaw =
    c.get("tgid")?.value ||
    h.get("x-telegram-id") ||
    h.get("x-tgid") ||
    (url ? url.searchParams.get("tgid") : "") ||
    "";

  const login = loginRaw.trim() || null;
  const tgid  = tgidRaw.trim()  || null;
  return { login, tgid };
}

/**
 * getSessionUser:
 * Returns the existing user from DB based on cookies/headers/query.
 * Does NOT create users. Returns null if not found.
 */
export async function getSessionUser(req?: Request): Promise<SessionUser | null> {
  const { login, tgid } = extractIds(req);

  if (login) {
    const u = await prisma.user.findUnique({
      where: { login },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (u) return u as SessionUser;
  }

  if (tgid) {
    const u = await prisma.user.findUnique({
      where: { tgid },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (u) {
      setCookie("tgid", u.tgid);
      setCookie("login", u.login);
      return u as SessionUser;
    }
  }

  return null;
}

/**
 * ensureUser:
 * Same as getSessionUser, but WILL create a user if none is found.
 * - If TGID exists → create login = tgid, name = user_<tgid>
 * - Otherwise create a guest with BOTH login and tgid = "guest-xxxx"
 * Also sets/refreshes cookies.
 */
export async function ensureUser(req: Request): Promise<SessionUser> {
  const { login, tgid } = extractIds(req);

  // 1) Try login first
  if (login) {
    const byLogin = await prisma.user.findUnique({
      where: { login },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (byLogin) {
      setCookie("tgid", byLogin.tgid);
      setCookie("login", byLogin.login);
      return byLogin as SessionUser;
    }
  }

  // 2) Try TGID, else create via TGID
  if (tgid) {
    const byTg = await prisma.user.findUnique({
      where: { tgid },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (byTg) {
      setCookie("tgid", byTg.tgid);
      setCookie("login", byTg.login);
      return byTg as SessionUser;
    }

    const created = await prisma.user.create({
      data: {
        tgid,
        login: tgid,             // spec: auto-register login = tgid
        name: `user_${tgid}`,
        password: rand(16),
        balance: 0,
      },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    setCookie("tgid", created.tgid);
    setCookie("login", created.login);
    return created as SessionUser;
  }

  // 3) Guest flow → both login and tgid set to the same unique string
  const guestId = `guest-${rand(8)}`;
  const guest = await prisma.user.create({
    data: {
      tgid: guestId,
      login: guestId,
      name: "Guest",
      password: rand(16),
      balance: 0,
    },
    select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
  });
  setCookie("tgid", guest.tgid);
  setCookie("login", guest.login);
  return guest as SessionUser;
}

/**
 * requireUser:
 * Ensure a user exists. If adminOnly=true, verify ADMIN role.
 * Throws an Error if forbidden; catch in your route and return 401/403.
 */
export async function requireUser(
  req?: Request,
  opts?: { adminOnly?: boolean }
): Promise<SessionUser> {
  const user = (await getSessionUser(req)) as SessionUser | null;
  if (!user) throw new Error("UNAUTHENTICATED");
  if (opts?.adminOnly && user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

/**
 * setSession:
 * Establish a session explicitly. Will upsert user by login or tgid.
 * Ensures `tgid` is NEVER null by mirroring login if needed.
 */
export async function setSession(payload: {
  login?: string | null;
  tgid?: string | null;
  name?: string | null;
}): Promise<SessionUser> {
  const login = payload.login?.trim() || null;
  const tgidIn = payload.tgid?.trim() || null;
  const name = (payload.name?.trim() || null) ?? null;

  // prefer TGID; if absent but login present, mirror it
  const tgid = tgidIn || login || `guest-${rand(8)}`;
  const finalLogin = login || tgid;

  let user = await prisma.user.findFirst({
    where: { OR: [{ login: finalLogin }, { tgid }] },
    select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        login: finalLogin,
        tgid,
        name: name || (tgid.startsWith("guest-") ? "Guest" : `user_${tgid}`),
        password: rand(16),
        balance: 0,
      },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
  } else {
    // Optionally sync name if provided
    if (name && name !== user.name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name },
        select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
      });
    }
  }

  setCookie("tgid", user.tgid);
  setCookie("login", user.login);
  return user as SessionUser;
}

export async function clearSession() {
  delCookie("login");
  delCookie("tgid");
}
