// Shared CSV / JSON export and import helpers. Used by DataTable-driven
// pages, admin tools, and ranking/pricing data exports. Centralized here so
// downstream pages don't reinvent escaping, BOM, or file picker UX.

export type CsvColumn<T> = {
  key: keyof T & string;
  header: string;
  format?: (value: T[keyof T & string], row: T) => string | number | null | undefined;
};

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: CsvColumn<T>[],
): string {
  const header = columns.map((col) => escapeCell(col.header)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        const formatted = col.format ? col.format(raw, row) : raw;
        return escapeCell(formatted);
      })
      .join(","),
  );
  return [header, ...lines].join("\n");
}

// Excel-friendly BOM. Without this, non-ASCII cells render as 乱码 in Excel.
const CSV_BOM = "\ufeff";

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
) {
  const csv = rowsToCsv(rows, columns);
  const blob = new Blob([CSV_BOM + csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

export function downloadJson(filename: string, payload: unknown) {
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ─── Import helpers ─────────────────────────────────────────────────────────

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("File read error"));
    reader.readAsText(file);
  });
}

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let insideQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (insideQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      insideQuotes = true;
    } else if (char === ",") {
      current.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i += 1;
      current.push(cell);
      cell = "";
      if (current.length > 1 || current[0] !== "") rows.push(current);
      current = [];
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || current.length > 0) {
    current.push(cell);
    rows.push(current);
  }
  return rows.filter((row) => !(row.length === 1 && row[0] === ""));
}

export type CsvImporterOptions<T> = {
  columns: CsvColumn<T>[];
  // Optional validation. Throw to reject the row.
  validate?: (row: T, index: number) => void;
};

export function importCsvAsRecords<T extends Record<string, unknown>>(
  text: string,
  options: CsvImporterOptions<T>,
): T[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const [headerRow, ...bodyRows] = rows;
  const keyByHeader = new Map<string, string>();
  for (const col of options.columns) {
    // header is treated as the import key, matching the CSV header column.
    keyByHeader.set(col.header, col.key);
  }
  const result: T[] = [];
  for (let i = 0; i < bodyRows.length; i += 1) {
    const cells = bodyRows[i];
    const record: Record<string, string> = {};
    headerRow.forEach((header, idx) => {
      const key = keyByHeader.get(header.trim());
      if (key) record[key] = cells[idx] ?? "";
    });
    result.push(record as T);
    options.validate?.(record as T, i);
  }
  return result;
}

export async function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      resolve(file);
    };
    // Cancel handler — modern browsers don't fire on cancel reliably, but
    // we at least give the promise a chance to settle.
    input.oncancel = () => resolve(null);
    input.click();
  });
}
