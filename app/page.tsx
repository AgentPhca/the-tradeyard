import Link from "next/link";
import { ArrowRight, ShieldCheck, Users2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-lg font-bold tracking-tight text-text">
            The <span className="text-primary">Tradeyard</span>
          </span>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary">
              Log in
            </Link>
            <Link href="/register" className="btn-primary">
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-4 rounded-full border border-border bg-surface px-4 py-1 text-sm text-muted">
          Built for NFL card collectors
        </p>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-text sm:text-6xl">
          Your trades happen on the <span className="text-primary">Yard</span>.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          Build your collection, track your wishlist, and connect with collectors,
          retailers, and streamers to make your next trade.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link href="/register" className="btn-primary">
            Join the Yard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/marketplace" className="btn-secondary">
            Browse Marketplace
          </Link>
        </div>

        <div className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-6 text-left">
            <Users2 className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold text-text">A real community</h3>
            <p className="mt-2 text-sm text-muted">
              Collectors, retailers, and streamers trading cards, not cash.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-6 text-left">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold text-text">Your collection, organized</h3>
            <p className="mt-2 text-sm text-muted">
              Track every card&mdash;condition, parallel, and print run&mdash;in one place.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
