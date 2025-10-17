import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center gap-6 py-24">
      <h1 className="text-4xl font-bold">Super Aylana</h1>
      <p className="text-neutral-300">Boshlash uchun Login yoki Register</p>
      <div className="flex gap-4">
        <Link href="/login" className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20">Login</Link>
        <Link href="/register" className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20">Register</Link>
      </div>
    </main>
  );
}
