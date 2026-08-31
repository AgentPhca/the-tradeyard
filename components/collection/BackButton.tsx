"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}
