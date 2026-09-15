"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";

interface DevLoginFormProps {
  next?: string;
  errorMessage: string | null;
}

// Collapsed by default so "Coming Soon" stays the page's visual focus —
// this access-code form is for developers/testers, not a general login,
// so it shouldn't look like one. Starts expanded when there's already an
// error to show (a failed submit redirects back here with ?error=...),
// so a wrong code never gets silently hidden behind a re-collapsed form.
export function DevLoginForm({ next, errorMessage }: DevLoginFormProps) {
  const [expanded, setExpanded] = useState(Boolean(errorMessage));

  if (!expanded) {
    return (
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-sm text-muted underline-offset-4 hover:text-text hover:underline"
        >
          Dev Login
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <p className="text-sm text-muted">Exclusive Preview &mdash; Enter your access code</p>

      <form method="POST" action="/preview-access/verify" className="mt-4 flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text">
            Access code
          </label>
          <Input id="password" name="password" type="password" autoComplete="off" required autoFocus />
        </div>

        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

        <button type="submit" className="btn-primary w-full">
          Enter
        </button>
      </form>
    </div>
  );
}
