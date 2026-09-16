import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "helstare-table-density";

function readModes(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function useTableCompactMode(tableKey: string): [boolean, (value: boolean) => void] {
  const [compact, setCompactState] = useState(() => Boolean(readModes()[tableKey]));
  const setCompact = useCallback((value: boolean) => {
    setCompactState(value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readModes(), [tableKey]: value }));
    } catch {
      // Storage may be disabled; the current session still keeps the setting.
    }
  }, [tableKey]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setCompactState(Boolean(readModes()[tableKey]));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [tableKey]);

  return [compact, setCompact];
}
