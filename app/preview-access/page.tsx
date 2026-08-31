import type { Metadata } from "next";
import { Input } from "@/components/ui/Input";

export const metadata: Metadata = {
  title: "Coming Soon – The Tradeyard",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Incorrect access code, please try again.",
  "not-configured": "Preview access isn't configured yet. Set PREVIEW_PASSWORD in the environment.",
};

export default async function PreviewAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.invalid) : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="mb-8 text-lg font-bold tracking-tight text-text">
        The <span className="text-primary">Tradeyard</span>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <h1 className="text-xl font-bold text-text">Coming Soon</h1>
        <p className="mt-1 text-sm text-muted">Exclusive Preview — Enter your access code</p>

        <form method="POST" action="/preview-access/verify" className="mt-6 flex flex-col gap-4">
          {next && <input type="hidden" name="next" value={next} />}

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text">
              Access code
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="off"
              required
              autoFocus
            />
          </div>

          {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

          <button type="submit" className="btn-primary w-full">
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
