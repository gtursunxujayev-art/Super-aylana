import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE = "sa_token";
const JWT_SECRET = process.env.JWT_SECRET!;

export type Session = { uid: string };

export function signSession(s: Session) {
  return jwt.sign(s, JWT_SECRET, { expiresIn: "180d" });
}
export function verifySession(token?: string): Session | null {
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET) as Session; }
  catch { return null; }
}
export async function getSessionUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  const s = verifySession(token);
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.uid } });
}
export async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new Error("UNAUTHENTICATED");
  return u;
}
export async function setSession(uid: string) {
  const token = signSession({ uid });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60*60*24*180
  });
}
export async function clearSession() {
  (await cookies()).set(COOKIE, "", { path: "/", maxAge: 0 });
}