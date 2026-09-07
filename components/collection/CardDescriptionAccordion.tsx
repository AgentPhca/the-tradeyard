"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface DescriptionField {
  label: string;
  value: string;
}

interface CardDescriptionAccordionProps {
  fields: DescriptionField[];
}

// The Card Detail page's "Beschreibung" section — closed by default, opens
// into a 2-column detail grid. Replaces the old always-visible label:value
// list, which is what made the page read like a generated data table.
export function CardDescriptionAccordion({ fields }: CardDescriptionAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-muted">Beschreibung</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-250 ease-in-out"
        style={{ maxHeight: open ? "480px" : "0px" }}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pb-4">
          {fields.map((field) => (
            <div key={field.label}>
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                {field.label}
              </p>
              <p className="mt-0.5 text-sm text-text">{field.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
