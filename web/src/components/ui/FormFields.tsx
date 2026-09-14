import type { ReactNode } from "react";
import { useMemo } from "react";

type FieldRowProps = {
  label: ReactNode;
  required?: boolean;
  help?: ReactNode;
  error?: string | null;
  children: ReactNode;
};

export function FormSection({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return <section className="admin-form-section"><div className="admin-form-section__heading"><h3 className="text-overline font-mono uppercase tracking-widest text-muted">{title}</h3>{description && <p className="text-micro normal-case font-sans text-muted">{description}</p>}</div>{children}</section>;
}

export function FieldRow({ label, required, help, error, children }: FieldRowProps) {
  return <label className={`admin-field ${error ? "admin-field--error" : ""}`}><span className="admin-field__label">{label}{required && <em className="ml-1 not-italic text-danger">*</em>}</span>{children}{help && <small className="admin-field__help">{help}</small>}{error && <small role="alert" className="admin-field__error">{error}</small>}</label>;
}

type JsonEditorFieldProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
};

export function JsonEditorField({ label, value, onChange, placeholder = '{"key":"value"}', maxLength = 32768 }: JsonEditorFieldProps) {
  const error = useMemo(() => {
    if (!value.trim()) return null;
    if (value.length > maxLength) return `JSON exceeds ${maxLength.toLocaleString()} characters.`;
    try { JSON.parse(value); return null; } catch (cause) { return cause instanceof Error ? cause.message : "Invalid JSON."; }
  }, [maxLength, value]);
  function format() {
    if (error || !value.trim()) return;
    onChange(JSON.stringify(JSON.parse(value), null, 2));
  }
  return <FieldRow label={label} error={error}><textarea value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} rows={4} spellCheck={false} placeholder={placeholder} className="w-full resize-y border border-[#121110]/15 bg-transparent px-2 py-2 text-sm font-mono outline-none" /><div className="flex gap-3 normal-case"><button type="button" className="text-micro text-muted hover:text-ink" onClick={format} disabled={Boolean(error) || !value.trim()}>Format JSON</button><button type="button" className="text-micro text-muted hover:text-ink" onClick={() => onChange("")}>Restore default</button><span className="ml-auto text-micro text-muted">{value.length.toLocaleString()}/{maxLength.toLocaleString()}</span></div></FieldRow>;
}

export function AsyncSubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <button type="submit" disabled={busy} className="rounded-md bg-inverse px-5 py-2 text-overline font-mono uppercase text-white transition-opacity disabled:opacity-50">{busy ? "Saving..." : children}</button>;
}

export function DataSourceState({ loading, error, empty, onRetry }: { loading: boolean; error?: string | null; empty?: boolean; onRetry?: () => void }) {
  if (loading) return <p className="py-8 text-center text-caption text-muted" role="status">Loading...</p>;
  if (error) return <div className="border-l-2 border-danger bg-red-50 px-3 py-3 text-caption text-danger" role="alert"><p>{error}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-2 underline">Retry</button>}</div>;
  if (empty) return <p className="py-8 text-center text-caption text-muted">No data available.</p>;
  return null;
}
