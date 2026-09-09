interface DescriptionField {
  label: string;
  value: string;
}

interface CardDescriptionGridProps {
  fields: DescriptionField[];
}

// The Card Detail page's "Beschreibung" section — always expanded. Used to
// be a closed-by-default accordion (CardDescriptionAccordion); hiding a
// card's own basic details behind an extra tap added friction without a
// real upside.
export function CardDescriptionGrid({ fields }: CardDescriptionGridProps) {
  return (
    <div className="border-b border-border pb-4">
      <p className="mt-3.5 mb-3 text-sm font-semibold text-muted">Beschreibung</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
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
  );
}
