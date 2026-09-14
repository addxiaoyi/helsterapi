import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "../../lib/LanguageContext";
import { ApiError, api } from "../../lib/api";
import { useModalFocus } from "../../lib/useModalFocus";

/**
 * Payment compliance gate — shown before the first paid top-up of a session.
 * Backend stores the version string the user accepted; without confirmation,
 * downstream paid endpoints may refuse the request. The modal is dismissable
 * only by confirming.
 */
const STORAGE_KEY = "zzznew:payment-compliance-accepted";

export default function PaymentComplianceGate(): React.ReactElement | null {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    // Show gate once per session if user opens Wallet/Topup/Subscriptions
    const openHandler = () => setOpen(true);
    window.addEventListener("zzznew:open-compliance", openHandler);
    return () =>
      window.removeEventListener("zzznew:open-compliance", openHandler);
  }, []);

  const cancel = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  const containerRef = useModalFocus({
    active: open,
    onEscape: cancel,
  });

  const confirm = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.confirmPaymentCompliance();
      sessionStorage.setItem(STORAGE_KEY, "1");
      window.dispatchEvent(
        new CustomEvent("zzznew:payment-compliance-confirmed"),
      );
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("Unable to record acceptance.", "无法记录合规确认。"),
      );
    } finally {
      setSubmitting(false);
    }
  }, [t]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-6 animate-in fade-in duration-150"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-lg border border-ink/10 bg-paper shadow-2xl animate-in slide-in-from-bottom-2 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compliance-gate-title"
      >
        <div className="border-b border-ink/10 px-6 py-4">
          <h2
            id="compliance-gate-title"
            className="font-serif text-xl text-ink"
          >
            {t("Payment Compliance", "支付合规确认")}
          </h2>
        </div>
        <div className="space-y-3 px-6 py-5 text-caption text-ink/80">
          <p>
            {t(
              "Before completing a top-up or subscription payment, please confirm you understand the provider terms. This acknowledgment is stored against your account and is required once per major version.",
              "在完成充值或订阅支付前，请确认您了解支付渠道的条款。此次确认将与您的账户关联，并按主版本号要求至少确认一次。",
            )}
          </p>
          <ul className="list-inside list-disc space-y-1 text-caption text-muted">
            <li>
              {t(
                "Refunds follow the upstream provider's policy.",
                "退款遵循上游支付渠道的策略。",
              )}
            </li>
            <li>
              {t(
                "Anti-fraud checks may delay first-time top-ups.",
                "反欺诈审核可能导致首次充值延迟。",
              )}
            </li>
            <li>
              {t(
                "Personal data is processed under our privacy policy.",
                "个人数据按我们的隐私政策处理。",
              )}
            </li>
          </ul>
          {error && (
            <p
              className="border-l-2 border-red-600 bg-red-50 p-2 text-caption text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-ink/10 px-6 py-4">
          <button
            type="button"
            disabled={submitting}
            onClick={cancel}
            className="border border-ink/20 px-5 py-2 font-mono text-overline uppercase tracking-widest text-ink transition-colors hover:bg-ink/5 disabled:opacity-50"
          >
            {t("Later", "稍后")}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            disabled={submitting}
            onClick={confirm}
            className="bg-ink px-5 py-2 font-mono text-overline uppercase tracking-widest text-paper transition-colors hover:bg-black disabled:opacity-50"
          >
            {submitting
              ? t("Recording...", "记录中...")
              : t("I Agree", "我同意")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to dispatch the gate from a payment entrypoint.
 * Place a button onClick like `openPaymentComplianceGate()`.
 */
export function openPaymentComplianceGate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("zzznew:open-compliance"));
  }
}
