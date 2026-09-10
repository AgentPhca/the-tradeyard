import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        // text-base (16px) on mobile — iOS Safari auto-zooms the viewport
        // when a focused field renders below 16px, and doesn't always
        // zoom back out cleanly. sm:text-sm keeps the original, tighter
        // desktop look where auto-zoom isn't a concern.
        className={`w-full rounded-md border border-border bg-background px-3 py-2 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
