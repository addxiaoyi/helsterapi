import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../lib/AppContext";
import { useLang } from "../lib/LanguageContext";

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function RequireAuth({ children, adminOnly }: Props) {
  const { user, isLoading: loading } = useApp();
  const location = useLocation();
  const { t } = useLang();

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-paper"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span
              className="absolute inset-0 border border-ink/10 animate-ping"
              style={{ animationDuration: "3s" }}
              aria-hidden="true"
            />
            <span
              className="absolute inset-2 border border-ink/30 animate-ping"
              style={{ animationDuration: "2s" }}
              aria-hidden="true"
            />
            <span
              className="h-1.5 w-1.5 bg-ink animate-pulse"
              aria-hidden="true"
            />
          </div>
          <p className="mt-6 font-mono text-overline uppercase tracking-[0.3em] text-muted">
            {t("Authenticating…", "正在验证身份…")}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
        replace
      />
    );
  }

  if (adminOnly && (user.role ?? 0) < 10) {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
}
