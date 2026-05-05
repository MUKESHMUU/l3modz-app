import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">
      <div className="max-w-3xl rounded-3xl border border-white/10 bg-slate-900/90 p-10 shadow-2xl shadow-black/20">
        <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">Welcome to L3modz</h1>
        <p className="mt-6 text-lg text-slate-300">Your Next.js frontend is now connected to the app router. Use the links below to explore the store or admin dashboard.</p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Browse Products
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
