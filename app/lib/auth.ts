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
  tgid: string | null;
  balance: number;
  role: "USER" | "ADMIN";
};

function rand(n = 10) {
  return randomBytes(n).toString("hex").slice(0, n);
}

/** Low-level cookie setters used by all helpers */
function setCookie(key: string, value: string) {
  cookies().set(key, value, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
}
function delCookie(key: string) {
  cookies().set(key, "", { path: "/", maxAge: 0 });
}

/** Try to read login / tgid from cookies, headers, or query */
function extractIds(req?: Request) {
  const c = cookies();
  const h = headers();
  const url = req ? new URL(req.url) : null;

  const login =
    c.get("login")?.value ||
    h.get("x-login") ||
    (url ? url.searchParams.get("login") : "") ||
    "";

  const tgid =
    c.get("tgid")?.value ||
    h.get("x-telegram-id") ||
    h.get("x-tgid") ||
    (url ? url.searchParams.get("tgid") : "") ||
    "";

  return {
    login: login?.trim() || null,
    tgid: tgid?.trim() || null,
  };
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
      // keep cookies in sync
      setCookie("tgid", u.tgid || "");
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
 * - Otherwise create a guest user login = "guest-xxxx"
 * Also sets/refreshes cookies.
 */
export async function ensureUser(req: Request): Promise<SessionUser> {
  const { login, tgid } = extractIds(req);

  // 1) login cookie → fetch
  if (login) {
    const byLogin = await prisma.user.findUnique({
      where: { login },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (byLogin) {
      // refresh TG cookie if necessary
      if (byLogin.tgid) setCookie("tgid", byLogin.tgid);
      setCookie("login", byLogin.login);
      return byLogin as SessionUser;
    }
  }

  // 2) tgid → fetch or create
  if (tgid) {
    const byTg = await prisma.user.findUnique({
      where: { tgid },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (byTg) {
      setCookie("tgid", byTg.tgid || "");
      setCookie("login", byTg.login);
      return byTg as SessionUser;
    }

    // create new TG user
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
    setCookie("tgid", created.tgid || "");
    setCookie("login", created.login);
    return created as SessionUser;
  }

  // 3) fallback → create guest
  const guestLogin = `guest-${rand(8)}`;
  const guest = await prisma.user.create({
    data: {
      tgid: null,
      login: guestLogin,
      name: "Guest",
      password: rand(16),
      balance: 0,
    },
    select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
  });
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
 * Utility for auth routes to establish a session explicitly.
 * It will upsert a user by login or tgid, then set cookies.
 *
 * Example payloads:
 *   setSession({ login: '9999', name: 'Alice' })
 *   setSession({ tgid: '123456', name: '@alice' })
 */
export async function setSession(payload: {
  login?: string | null;
  tgid?: string | null;
  name?: string | null;
}): Promise<SessionUser> {
  const login = payload.login?.trim() || null;
  const tgid = payload.tgid?.trim() || null;
  const name = (payload.name?.trim() || null) ?? null;

  let user: SessionUser | null = null;

  if (login) {
    const found = await prisma.user.findUnique({
      where: { login },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (found) {
      user = found as SessionUser;
    } else {
      const created = await prisma.user.create({
        data: {
          login,
          tgid,
          name: name || (tgid ? `user_${tgid}` : "Guest"),
          password: rand(16),
          balance: 0,
        },
        select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
      });
      user = created as SessionUser;
    }
  } else if (tgid) {
    const byTg = await prisma.user.findUnique({
      where: { tgid },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (byTg) {
      user = byTg as SessionUser;
    } else {
      const created = await prisma.user.create({
        data: {
          tgid,
          login: tgid, // spec
          name: name || `user_${tgid}`,
          password: rand(16),
          balance: 0,
        },
        select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
      });
      user = created as SessionUser;
    }
  } else {
    // no identifiers → create guest
    const created = await prisma.user.create({
      data: {
        tgid: null,
        login: `guest-${rand(8)}`,
        name: name || "Guest",
        password: rand(16),
        balance: 0,
      },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    user = created as SessionUser;
  }

  // Set cookies for subsequent requests
  if (user.tgid) setCookie("tgid", user.tgid);
  setCookie("login", user.login);

  return user;
}

/** Optional: clear session (not required by your imports but handy) */
export async function clearSession() {
  delCookie("login");
  delCookie("tgid");
}
