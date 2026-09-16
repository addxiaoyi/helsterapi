import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export type ActionMenuItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
};

export function ActionMenu({ label, items, disabled, className }: { label: string; items: ActionMenuItem[]; disabled?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button type="button" disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex min-h-9 items-center gap-2 rounded-md border border-ink/15 bg-paper px-3 text-caption text-ink disabled:opacity-50">
        {label}<ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-[var(--z-overlay)] mt-1 min-w-52 rounded-md border border-ink/15 bg-paper/95 p-1 shadow-floating backdrop-blur-xl">
          {items.map((item) => (
            <button key={item.key} type="button" role="menuitem" disabled={item.disabled} onClick={() => { setOpen(false); item.onSelect(); }} className={cn("flex min-h-9 w-full items-center gap-2 rounded px-3 text-left text-caption hover:bg-ink/5 disabled:opacity-40", item.danger ? "text-danger" : "text-ink")}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
