import Link from 'next/link'

export default function LoginRequired() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <h2 className="text-2xl font-semibold mb-2">Kirish talab qilinadi</h2>
        <p className="text-zinc-400 mb-6">
          Davom etish uchun login yoki ro‘yxatdan o‘ting.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-5 py-2 font-medium hover:bg-blue-500"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-zinc-600 px-5 py-2 font-medium hover:bg-zinc-700"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
