import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-6 text-center text-sm text-muted sm:flex-row sm:justify-between sm:text-left">
        <p>The Tradeyard &ndash; Ein privates Hobbyprojekt. Kein Gewerbe.</p>
        <nav className="flex items-center gap-4">
          <Link href="/impressum" className="hover:text-text">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-text">
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-text">
            AGB
          </Link>
        </nav>
      </div>
    </footer>
  );
}
