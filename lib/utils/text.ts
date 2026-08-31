import type { Parallel } from "@/lib/types/database";

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Renders a parallels row as one dropdown option label, e.g.
// "Sky Blue Refractor /325" or "Blue & Orange Spark (Mega Box exclusive
// (1:3 packs))". Shared by the Add Card and Wishlist forms.
export function parallelLabel(p: Pick<Parallel, "parallel_name" | "print_run" | "sku_exclusivity">) {
  const printRunSuffix = p.print_run != null ? ` /${p.print_run}` : "";
  const exclusivitySuffix = p.sku_exclusivity ? ` (${p.sku_exclusivity})` : "";
  return `${p.parallel_name}${printRunSuffix}${exclusivitySuffix}`;
}
