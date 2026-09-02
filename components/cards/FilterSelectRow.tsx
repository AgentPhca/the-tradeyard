"use client";

import { Select } from "@/components/ui/Select";

export interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectRowProps {
  team: string;
  onTeamChange: (value: string) => void;
  teamOptions: FilterSelectOption[];

  setName: string;
  onSetChange: (value: string) => void;
  setOptions: FilterSelectOption[];

  insertSet: string;
  onInsertSetChange: (value: string) => void;
  insertSetOptions: FilterSelectOption[];

  parallel: string;
  onParallelChange: (value: string) => void;
  parallelOptions: FilterSelectOption[];
}

// The Team / Set / Insert Set / Parallel filter grid — shared by Marketplace
// (global catalog option lists, URL-param-backed state) and Collection
// (option lists scoped to the owner's own cards, local state). This only
// renders the row; each caller supplies its own option lists and
// values/handlers.
export function FilterSelectRow({
  team,
  onTeamChange,
  teamOptions,
  setName,
  onSetChange,
  setOptions,
  insertSet,
  onInsertSetChange,
  insertSetOptions,
  parallel,
  onParallelChange,
  parallelOptions,
}: FilterSelectRowProps) {
  const hasSet = Boolean(setName);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Select value={team} onChange={(e) => onTeamChange(e.target.value)}>
        <option value="">All teams</option>
        {teamOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select value={setName} onChange={(e) => onSetChange(e.target.value)}>
        <option value="">All sets</option>
        {setOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select
        value={insertSet}
        onChange={(e) => onInsertSetChange(e.target.value)}
        disabled={!hasSet}
      >
        <option value="">{hasSet ? "All insert sets" : "Select a set first"}</option>
        {insertSetOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      <Select
        value={parallel}
        onChange={(e) => onParallelChange(e.target.value)}
        disabled={!hasSet}
      >
        <option value="">{hasSet ? "All parallels" : "Select a set first"}</option>
        {parallelOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
