"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/Switch";

interface VisibilityToggleProps {
  profileId: string;
  initialValue: boolean;
}

// The one place that writes profiles.show_personal_collection. Every
// on-page toggle (Edit Profile, the Profile "My Collection" tab, the
// Collection page) renders this component so they share the same mutation
// and, since each write trusts only what the server returns, the same
// source of truth for what's actually persisted.
export function VisibilityToggle({ profileId, initialValue }: VisibilityToggleProps) {
  const router = useRouter();
  const supabase = createClient();
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange() {
    const next = !value;
    setSubmitting(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ show_personal_collection: next })
      .eq("id", profileId)
      .select("show_personal_collection")
      .single();

    if (updateError || !data) {
      setError(updateError?.message ?? "Failed to update.");
      setSubmitting(false);
      return;
    }

    setValue(data.show_personal_collection);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text">
          Personal Collection: {value ? "Public" : "Private"}
        </span>
        <Switch checked={value} onChange={handleChange} disabled={submitting} />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
