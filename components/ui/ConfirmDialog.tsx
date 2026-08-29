"use client";

import type { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {description && <div className="mt-2 text-sm text-muted">{description}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={confirming}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-60"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
