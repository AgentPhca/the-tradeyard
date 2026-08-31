"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface QuickVisibilityToggleProps {
  profileId: string;
}

export function QuickVisibilityToggle({ profileId }: QuickVisibilityToggleProps) {
  const router = useRouter();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({ show_personal_collection: true })
      .eq("id", profileId);
    setSubmitting(false);
    if (!error) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      className="text-primary underline-offset-2 hover:underline disabled:opacity-60"
    >
      {submitting ? "Making it public..." : "Show it publicly"}
    </button>
  );
}
