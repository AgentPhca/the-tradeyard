"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/Switch";
import type { Profile } from "@/lib/types/database";

type VisibilityField = "show_personal_collection" | "show_baseyard_publicly";

interface VisibilityToggleProps {
  profileId: string;
  initialValue: boolean;
  // Which profiles boolean column this instance controls. Defaults to
  // show_personal_collection so every existing call site (Edit Profile, the
  // Profile "My Collection" tab, the Collection page) keeps working
  // unchanged.
  field?: VisibilityField;
  // Shown as "<label>: Public/Private". Defaults to match the field.
  label?: string;
}

const DEFAULT_LABEL: Record<VisibilityField, string> = {
  show_personal_collection: "Personal Collection",
  show_baseyard_publicly: "BaseYard",
};

// The one place that writes either visibility column. Every on-page toggle
// renders this component so they share the same mutation and, since each
// write trusts only what the server returns, the same source of truth for
// what's actually persisted.
export function VisibilityToggle({
  profileId,
  initialValue,
  field = "show_personal_collection",
  label,
}: VisibilityToggleProps) {
  const router = useRouter();
  const supabase = createClient();
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange() {
    const next = !value;
    setSubmitting(true);
    setError(null);

    const updatePayload = { [field]: next } as Pick<Profile, VisibilityField>;
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", profileId)
      .select(field)
      .single();

    if (updateError || !data) {
      setError(updateError?.message ?? "Failed to update.");
      setSubmitting(false);
      return;
    }

    setValue((data as Record<VisibilityField, boolean>)[field]);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text">
          {label ?? DEFAULT_LABEL[field]}: {value ? "Public" : "Private"}
        </span>
        <Switch checked={value} onChange={handleChange} disabled={submitting} />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
