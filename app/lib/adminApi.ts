'use client'

export function getAdminKey(): string | null {
  try { return localStorage.getItem('adminKey') } catch { return null }
}

export function setAdminKey(k: string) {
  try { localStorage.setItem('adminKey', k) } catch {}
}

export async function adminGet<T>(url: string): Promise<T> {
  const k = getAdminKey()
  const res = await fetch(url, {
    headers: { 'x-admin-key': k ?? '' }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function adminPost<T>(url: string, body: any): Promise<T> {
  const k = getAdminKey()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-key': k ?? '' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function adminPatch<T>(url: string, body: any): Promise<T> {
  const k = getAdminKey()
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-admin-key': k ?? '' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}