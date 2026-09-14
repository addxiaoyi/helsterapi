import React, { createContext, useContext, useRef, useState } from "react";
import { X } from "lucide-react";
import { useModalFocus } from "../../lib/useModalFocus";

type ConfirmVariant = "default" | "danger";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  input?: {
    label: string;
    placeholder?: string;
    type?: "text" | "number";
    min?: number;
    initialValue?: string;
  };
};

type PendingConfirm = ConfirmOptions & { resolve: (value: string | null) => void };

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<string | null>;
};

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  // Hold the latest pending request in a ref so close() never needs to
  // touch React state to resolve a promise. This sidesteps React 18's
  // automatic batching and strict-mode double-invocation that would
  // otherwise leave the consumer's `await confirm()` hanging forever.
  const pendingRef = useRef<PendingConfirm | null>(null);

  const close = (value: string | null) => {
    const resolver = pendingRef.current?.resolve;
    pendingRef.current = null;
    setPending(null);
    setInputValue("");
    if (resolver) queueMicrotask(() => resolver(value));
  };

  const containerRef = useModalFocus({
    active: Boolean(pending),
    onEscape: () => close(null),
  });

  const confirm = (options: ConfirmOptions) =>
    new Promise<string | null>((resolve) => {
      const request: PendingConfirm = { ...options, resolve };
      pendingRef.current = request;
      setPending(request);
      setInputValue(options.input?.initialValue ?? "");
    });

  const handleConfirm = () => {
    if (!pending) return;
    if (pending.input) {
      if (!inputValue.trim()) return;
      close(inputValue);
    } else {
      close("ok");
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/40 p-6 animate-in fade-in duration-150"
          role="presentation"
          onMouseDown={(event) => {
            // close only when the click started on the backdrop, not the dialog
            if (event.target === event.currentTarget) close(null);
          }}
        >
          <div
            ref={containerRef}
            className="w-full max-w-md border border-ink/10 bg-paper shadow-2xl animate-in slide-in-from-bottom-2 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-6 py-4">
              <h2
                id="confirm-dialog-title"
                className="font-serif text-xl text-ink"
              >
                {pending.title}
              </h2>
              <button
                type="button"
                onClick={() => close(null)}
                aria-label="Close"
                className="text-muted transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            {(pending.description || pending.input) && (
              <div className="space-y-3 px-6 py-5">
                {pending.description && (
                  <p className="text-caption leading-relaxed text-muted">
                    {pending.description}
                  </p>
                )}
                {pending.input && (
                  <label className="block">
                    <span className="mb-1 block font-mono text-overline uppercase tracking-[0.2em] text-muted">
                      {pending.input.label}
                    </span>
                    <input
                      ref={inputRef}
                      type={pending.input.type ?? "text"}
                      min={pending.input.min}
                      placeholder={pending.input.placeholder}
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      className="w-full border border-ink/15 bg-paper px-3 py-2 text-body-lg text-ink outline-none transition-colors focus:border-ink focus:ring-1 focus:ring-ink"
                    />
                  </label>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 border-t border-ink/10 px-6 py-4">
              <button
                type="button"
                onClick={() => close(null)}
                className="border border-ink/20 px-5 py-2 font-mono text-overline uppercase tracking-widest text-ink transition-colors hover:bg-ink/5"
              >
                {pending.cancelText ?? "Cancel"}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={handleConfirm}
                disabled={Boolean(pending.input) && !inputValue.trim()}
                className={
                  pending.variant === "danger"
                    ? "bg-red-700 px-5 py-2 font-mono text-overline uppercase tracking-widest text-white transition-colors hover:bg-red-800 disabled:opacity-50"
                    : "bg-ink px-5 py-2 font-mono text-overline uppercase tracking-widest text-paper transition-colors hover:bg-black disabled:opacity-50"
                }
              >
                {pending.confirmText ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue["confirm"] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx.confirm;
}
