import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

type ToastInput = string | { message: string; kind?: ToastKind; duration?: number };

type ToastItem = {
  id: number;
  message: string;
  kind: ToastKind;
  duration: number;
  remaining: number;
  paused: boolean;
};

type ToastContextValue = {
  notify: (input: ToastInput) => void;
  success: (input: string | { message: string; duration?: number }) => void;
  error: (input: string | { message: string; duration?: number }) => void;
  info: (input: string | { message: string; duration?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

const kindStyles: Record<ToastKind, {
  bg: string;
  border: string;
  text: string;
  Icon: typeof CheckCircle2;
  barColor: string;
  iconColor: string;
}> = {
  success: {
    bg: "bg-paper",
    border: "border-ink/15",
    text: "text-ink",
    Icon: CheckCircle2,
    barColor: "bg-emerald-600",
    iconColor: "text-emerald-700",
  },
  error: {
    bg: "bg-paper",
    border: "border-red-300",
    text: "text-red-700",
    Icon: AlertCircle,
    barColor: "bg-red-600",
    iconColor: "text-red-600",
  },
  info: {
    bg: "bg-paper",
    border: "border-ink/15",
    text: "text-ink",
    Icon: Info,
    barColor: "bg-ink",
    iconColor: "text-ink",
  },
};

const TICK_MS = 16;
const MAX_VISIBLE_TOASTS = 5;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const itemsRef = useRef<ToastItem[]>([]);
  itemsRef.current = items;
  const lastTickRef = useRef<number>(Date.now());

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    lastTickRef.current = Date.now();
    const handle = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      const toRemove: number[] = [];
      setItems((current) =>
        current
          .map((item) => {
            if (item.paused || item.duration <= 0) return item;
            const remaining = Math.max(0, item.remaining - delta);
            if (remaining === 0) toRemove.push(item.id);
            return { ...item, remaining };
          })
          .filter((item) => !toRemove.includes(item.id)),
      );
    }, TICK_MS);
    return () => window.clearInterval(handle);
  }, [items.length]);

  const setPaused = useCallback((id: number, paused: boolean) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, paused } : item)),
    );
  }, []);

  const notify = useCallback((input: ToastInput) => {
    const payload = typeof input === "string" ? { message: input } : input;
    const id = nextId++;
    const duration = payload.duration ?? 3000;
    const item: ToastItem = {
      id,
      message: payload.message,
      kind: payload.kind ?? "info",
      duration,
      remaining: duration,
      paused: false,
    };
    setItems((current) => [...current, item]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (input) => notify({ ...(typeof input === "string" ? { message: input } : input), kind: "success" }),
      error: (input) => notify({ ...(typeof input === "string" ? { message: input } : input), kind: "error" }),
      info: (input) => notify({ ...(typeof input === "string" ? { message: input } : input), kind: "info" }),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-[100] flex max-h-[calc(100vh-2rem)] w-full max-w-sm flex-col gap-2 overflow-y-auto no-scrollbar"
        role="region"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.slice(-MAX_VISIBLE_TOASTS).map((item) => {
          const style = kindStyles[item.kind];
          const Icon = style.Icon;
          const progress =
            item.duration > 0
              ? Math.max(0, Math.min(1, item.remaining / item.duration))
              : 0;
          return (
            <div
              key={item.id}
              onMouseEnter={() => setPaused(item.id, true)}
              onMouseLeave={() => setPaused(item.id, false)}
              onFocus={() => setPaused(item.id, true)}
              onBlur={() => setPaused(item.id, false)}
              className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden border ${style.border} ${style.bg} pr-4 shadow-toast animate-in slide-in-from-right-4 fade-in duration-200`}
              role="status"
            >
              <div className="px-4 pt-3">
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`}
                  strokeWidth={1.5}
                />
              </div>
              <p className={`flex-1 pt-3 pb-3 text-caption leading-relaxed ${style.text}`}>
                {item.message}
              </p>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label="Dismiss"
                className="mt-3 shrink-0 text-muted transition-colors hover:text-ink"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              {item.duration > 0 && (
                <div
                  className={`absolute bottom-0 left-0 h-[2px] ${style.barColor} transition-[width] ease-linear`}
                  style={{
                    width: `${progress * 100}%`,
                    transitionDuration: `${item.paused ? 0 : TICK_MS}ms`,
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
