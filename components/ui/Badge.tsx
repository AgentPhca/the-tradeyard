import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "primary" | "special";
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variants = {
    default: "border-border bg-surface text-muted",
    primary: "border-primary/30 bg-primary/10 text-primary",
    // Owner/Admin — visually distinct as a trusted/staff role.
    special: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
