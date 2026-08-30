import Link from "next/link";
import type { ReactNode } from "react";

interface LegalLayoutProps {
  title: string;
  children: ReactNode;
}

export function LegalLayout({ title, children }: LegalLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="mb-8 inline-block text-sm text-muted hover:text-text">
        &larr; Zur Startseite
      </Link>
      <h1 className="text-2xl font-bold text-text">{title}</h1>
      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-text">
        {children}
      </div>
    </div>
  );
}
