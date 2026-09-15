import { type ReactNode } from "react";
import { useLang } from "../../lib/LanguageContext";
import { RefreshCw } from "lucide-react";

type Action = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
};

type Props = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: Action[] | ReactNode;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function PageContainer({
  title,
  subtitle,
  children,
  actions,
  isLoading,
  error,
  onRetry,
}: Props) {
  const { t } = useLang();

  return (
    <div className="relative flex min-h-0 h-full flex-col gap-3 px-[var(--space-page)] py-3">
      {/* Header */}
      <div className="admin-section-header sticky top-0 z-20 -mx-[var(--space-page)] bg-paper/92 px-[var(--space-page)] py-2 backdrop-blur-xl flex-col items-start lg:flex-row lg:items-center">
        <div className="min-w-[14rem] max-w-full flex-1 flex flex-col gap-1">
          <h1 className="text-title font-bold leading-tight tracking-normal text-ink">{title}</h1>
          {subtitle && (
            <p className="text-micro text-muted">{subtitle}</p>
          )}
        </div>
        {actions && (
            <div className="admin-toolbar no-scrollbar flex w-full flex-nowrap items-center justify-start gap-1.5 overflow-x-auto pb-1 lg:w-auto lg:max-w-[min(100%,52rem)] lg:flex-wrap lg:justify-end lg:overflow-visible lg:pb-0">
            {Array.isArray(actions) ? (
              actions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={[
                    "flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 text-caption font-medium uppercase leading-none transition-colors disabled:cursor-not-allowed",
                    action.variant === "primary"
                      ? "border-ink bg-ink text-paper"
                      : action.variant === "ghost"
                        ? "border-transparent text-muted hover:text-ink disabled:opacity-50"
                        : "border-ink/20 text-ink hover:bg-ink/5 disabled:opacity-50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))
            ) : (
              actions
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-20 sm:pb-5">
        {error ? (
          <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-caption text-danger">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex min-h-9 items-center gap-1.5 border border-ink px-3 py-1.5 text-caption font-medium uppercase transition-colors hover:bg-ink/5"
              >
                <RefreshCw className="h-3 w-3" />
                {t("Retry", "重试")}
              </button>
            )}
          </div>
        ) : (
          children
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-paper/40 backdrop-blur-[1px]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
        </div>
      )}
    </div>
  );
}
