// Reference data for the "Add Card" form.
//
// NOTE: The exact parallel names, colors, and print runs for each 2025 Topps
// product differ (and Chrome Black in particular uses its own parallel
// ladder). The list below is a generic Chrome-family placeholder covering
// the tiers common across Chrome-style Topps NFL products, ordered roughly
// most-to-least common. Swap this out for the real checklist data (Chrome,
// Finest, Cosmic Chrome, Chrome Black) once it's available — everything
// else in the app (serial number, print run) is free text, so it already
// works with real card data either way.

export const CARD_SETS = [
  { value: "2025 Topps Chrome", label: "2025 Topps Chrome" },
  { value: "2025 Topps Finest", label: "2025 Topps Finest" },
  { value: "2025 Topps Cosmic Chrome", label: "2025 Topps Cosmic Chrome" },
  { value: "2025 Topps Chrome Black", label: "2025 Topps Chrome Black" },
] as const;

export const PARALLELS = [
  "Base",
  "Refractor",
  "X-Fractor",
  "Prism Refractor",
  "Green Refractor",
  "Blue Refractor",
  "Purple Refractor",
  "Pink Refractor",
  "Gold Refractor",
  "Orange Refractor",
  "Red Refractor",
  "Sepia Refractor",
  "Black Refractor",
  "SuperFractor",
  "Printing Plate",
] as const;

export const CONDITIONS = [
  "Raw",
  "PSA 10",
  "PSA 9",
  "PSA 8",
  "BGS 9.5",
  "BGS 9",
  "SGC 10",
  "SGC 9.5",
] as const;
