import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLang } from "../../lib/LanguageContext";

/**
 * System notice banner — fetches /api/notice (operator-published text) and
 * renders it as a dismissible strip at the top of the page. Reads from
 * sessionStorage to remember dismissal within the tab session.
 */
const STORAGE_PREFIX = "zzznew:notice-dismissed:";

export default function NoticeBanner(): React.ReactElement | null {
  const { t } = useLang();
  const [text, setText] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [visible, setVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notice", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { data?: unknown };
      const value = data?.data;
      if (typeof value === "string" && value.trim().length > 0) {
        setText(value.trim());
        // Trigger entrance animation after mount
        requestAnimationFrame(() => setVisible(true));
      }
    } catch {
      // ignore — the notice is best-effort
    }
  }, []);

  useEffect(() => {
    const dismissedBefore = sessionStorage.getItem(STORAGE_PREFIX);
    if (dismissedBefore) {
      setDismissed(true);
    }
    void load();
  }, [load]);

  const dismiss = () => {
    setVisible(false);
    // Wait for exit animation to complete before unmount
    window.setTimeout(() => {
      setDismissed(true);
      if (text) sessionStorage.setItem(STORAGE_PREFIX + text, "1");
    }, 200);
  };

  if (!text || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`border-b border-ink/10 bg-warm px-4 py-2.5 text-caption text-ink transition-all duration-200 ease-out ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-[1600px] items-start gap-3">
        <span className="mt-0.5 inline-flex h-5 shrink-0 items-center border border-ink/30 bg-ink px-1.5 font-mono text-overline uppercase tracking-widest text-paper">
          {t("Notice", "公告")}
        </span>
        <p className="flex-1 whitespace-pre-wrap break-words leading-relaxed">
          {text}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("Dismiss notice", "关闭公告")}
          className="shrink-0 inline-flex items-center gap-1 border border-transparent px-2 py-0.5 font-mono text-overline uppercase tracking-widest text-muted transition-colors hover:border-ink/20 hover:text-ink"
        >
          <X className="h-3 w-3" strokeWidth={1.5} />
          <span className="hidden sm:inline">{t("Dismiss", "关闭")}</span>
        </button>
      </div>
    </div>
  );
}
