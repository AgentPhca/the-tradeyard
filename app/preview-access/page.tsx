import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { DevLoginForm } from "@/components/preview-access/DevLoginForm";

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
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="mb-4 text-lg font-bold tracking-tight text-text">
          The <span className="text-primary">Tradeyard</span>
        </div>

        <div className="max-w-lg text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-text sm:text-6xl">
            Coming Soon
          </h1>
          <p className="mt-6 text-lg text-muted">
            Build your collection, track your wishlist, and connect with collectors, retailers,
            and streamers to make your next trade.
          </p>
        </div>

        <div className="mt-16 w-full max-w-sm">
          <DevLoginForm next={next} errorMessage={errorMessage} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
