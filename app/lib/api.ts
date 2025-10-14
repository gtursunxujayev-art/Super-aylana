export async function api<T>(url:string, init?:RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'content-type':'application/json', ...(init?.headers||{}) } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function post<T>(url:string, data:any): Promise<T> {
  return api<T>(url, { method:'POST', body: JSON.stringify(data) })
}