// Simple admin guard used by admin API routes.
// It checks the "x-admin-key" header against the ADMIN_API_KEY env var.

export async function requireAdmin(req: Request): Promise<boolean> {
  const key = req.headers.get('x-admin-key') || ''
  const env = process.env.ADMIN_API_KEY || ''
  return Boolean(key && env && key === env)
}
