import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const dynamic = 'force-dynamic'
export const runtime = 'edge' // fast upload

export async function POST(req: Request) {
  try {
    // must be multipart/form-data
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ ok: false, error: 'NO_FILE' }, { status: 400 })
    }

    // require token
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      return NextResponse.json({ ok: false, error: 'MISSING_BLOB_TOKEN' }, { status: 500 })
    }

    const filename = `prizes/${Date.now()}-${(file as any).name || 'upload'}`
    const { url } = await put(filename, file, {
      access: 'public',
      token
    })

    return NextResponse.json({ ok: true, url })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}