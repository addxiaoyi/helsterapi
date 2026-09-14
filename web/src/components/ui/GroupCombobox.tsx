import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type GroupOption = {
  value: string;
  label: string;
  description?: string;
  ratio?: number | string;
};

type GroupComboboxProps = {
  options: GroupOption[];
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export function GroupCombobox({ options, value, placeholder, onChange }: GroupComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => `${option.value} ${option.label} ${option.description ?? ""} ${option.ratio ?? ""}`.toLowerCase().includes(needle));
  }, [options, query]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex min-h-12 w-full items-center justify-between gap-3 border border-[#121110]/20 bg-white px-3 py-2 text-left text-sm hover:border-[#121110]/40">
        <span className="min-w-0">
          <span className="block truncate font-medium">{selected?.label || placeholder}</span>
          {selected?.description && <span className="block truncate text-micro text-muted">{selected.description}</span>}
        </span>
        {selected?.ratio !== undefined && <span className="shrink-0 font-mono text-micro">×{selected.ratio}</span>}
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
      </button>
      {open && (
        <div role="listbox" className="absolute z-[var(--z-palette)] mt-1 max-h-72 w-full overflow-auto rounded-md border border-ink/15 bg-paper/95 p-1 shadow-floating backdrop-blur-xl">
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索分组 / Search groups" className="mb-1 w-full border-b border-[#121110]/10 px-2 py-2 text-sm outline-none" />
          {filtered.length === 0 ? <p className="px-3 py-3 text-caption text-muted">未找到分组 / No group found.</p> : filtered.map((option) => (
            <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => choose(option.value)} className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#121110]/5">
              <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${option.value === value ? "opacity-100" : "opacity-0"}`} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm">{option.label}</span>{option.description && <span className="block truncate text-micro text-muted">{option.description}</span>}</span>
              {option.ratio !== undefined && <span className="font-mono text-micro">×{option.ratio}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
