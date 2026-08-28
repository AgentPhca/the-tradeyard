import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <Link href="/" className="mb-8 text-lg font-bold tracking-tight text-text">
        The <span className="text-primary">Tradeyard</span>
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        {children}
      </div>
    </div>
  );
}
