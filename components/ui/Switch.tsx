interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

// Track: h-5 w-9 (20x36px). Knob: h-3 w-3 (12px), vertically centered by
// the track's own `items-center` flex alignment (not a manual top-offset,
// which is what previously made the knob drift off-center). Horizontally,
// translate-x-1 (4px) / translate-x-5 (20px) leave a matching 4px margin
// to the track's rounded end-cap in both the off and on state (36 - 20 -
// 12 = 4, same as the 4px start offset), so the knob sits concentric with
// each end-cap rather than poking past it.
export function Switch({ checked, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
        checked ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        className={`inline-block h-3 w-3 shrink-0 rounded-full bg-text transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
