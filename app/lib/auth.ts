import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.ADMIN_API_KEY || 'dev-key')

export async function issueSid(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret)
}

export async function getUserIdFromCookie(headers: Headers): Promise<string | null> {
  const rawCookie = headers.get('cookie') || ''
  const m = rawCookie.match(/(?:^|;\s*)sid=([^;]+)/)
  const sid = m?.[1]
  if (!sid) return null
  try {
    const { payload } = await jwtVerify(sid, secret)
    return (payload as any).uid as string
  } catch {
    return null
  }
}