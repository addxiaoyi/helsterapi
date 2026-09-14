import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

export function SelectMenu({ value, options, onChange, ariaLabel, disabled = false }: { value: string; options: SelectOption[]; onChange: (value: string) => void; ariaLabel?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    const index = options.findIndex((option) => option.value === value);
    setActiveIndex(index >= 0 ? index : 0);
  }, [options, value]);
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
  return (
    <div ref={rootRef} className="relative">
      <button type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => {
        if (options.length > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          setOpen(true);
          setActiveIndex((current) => (current + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
        } else if ((event.key === "Enter" || event.key === " ") && open) {
          event.preventDefault();
          onChange(options[activeIndex]?.value ?? value);
          setOpen(false);
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          setOpen(true);
          setActiveIndex(event.key === "Home" ? 0 : Math.max(options.length - 1, 0));
        }
      }} className="flex w-full items-center justify-between gap-2 border border-[#121110]/15 bg-white px-3 py-2 text-left text-caption hover:border-[#121110]/35 disabled:cursor-not-allowed disabled:opacity-50">
        <span className="truncate">{selected?.label || value}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
      </button>
      {open && <div role="listbox" className="absolute z-[var(--z-palette)] mt-1 max-h-64 w-full overflow-auto rounded-md border border-ink/15 bg-paper/95 p-1 shadow-floating backdrop-blur-xl">
        {options.map((option, index) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onMouseEnter={() => setActiveIndex(index)} onClick={() => { onChange(option.value); setOpen(false); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-caption hover:bg-[#121110]/5 ${activeIndex === index ? "bg-[#121110]/5" : ""}`}><Check className={`h-3.5 w-3.5 ${option.value === value ? "opacity-100" : "opacity-0"}`} />{option.label}</button>)}
      </div>}
    </div>
  );
}
