import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type MultiSelectOption = { value: string; label: string };

type MultiSelectMenuProps = {
  values: string[];
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
  placeholder: string;
};

export function MultiSelectMenu({ values, options, onChange, placeholder }: MultiSelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => new Set(values), [values]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? options.filter((option) => `${option.value} ${option.label}`.toLowerCase().includes(needle))
      : options;
  }, [options, query]);

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

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(options.filter((option) => next.has(option.value)).map((option) => option.value));
  }

  return (
    <div ref={rootRef} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between gap-2 border border-[#121110]/15 bg-white px-3 py-2 text-left text-caption hover:border-[#121110]/35">
        <span className="truncate">{values.length ? `${values.length} selected` : placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" className="absolute z-40 mt-1 max-h-72 w-full overflow-auto border border-[#121110]/15 bg-white p-1 shadow-lg">
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 / Search..." className="mb-1 w-full border-b border-[#121110]/10 px-2 py-2 text-sm outline-none" />
          {filtered.length === 0 ? <p className="px-3 py-3 text-caption text-muted">暂无选项 / No options found.</p> : filtered.map((option) => (
            <button key={option.value} type="button" role="option" aria-selected={selected.has(option.value)} onClick={() => toggle(option.value)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-caption hover:bg-[#121110]/5">
              <Check className={`h-3.5 w-3.5 ${selected.has(option.value) ? "opacity-100" : "opacity-0"}`} />
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
