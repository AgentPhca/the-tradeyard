import { forwardRef, type SelectHTMLAttributes } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <select
        ref={ref}
        // text-base (16px) on mobile — same iOS Safari auto-zoom-on-focus
        // reasoning as Input.tsx.
        className={`w-full rounded-md border border-border bg-background px-3 py-2 text-base text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm ${className}`}
        {...props}
      />
    );
  }
);
Select.displayName = "Select";
