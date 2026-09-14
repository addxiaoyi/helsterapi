import React from "react";
import { useLang } from "../../lib/LanguageContext";
import { RefreshCw } from "lucide-react";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled frontend render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorFallback error={this.state.error} />;
  }
}

function ErrorFallback({ error }: { error: Error }) {
  const { t } = useLang();
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6">
      <section className="w-full max-w-md border-l-2 border-ink px-6 py-8">
        <h1 className="mb-2 font-serif text-2xl text-ink">
          {t("Page failed to load", "页面加载失败")}
        </h1>
        <p className="mb-6 text-label leading-relaxed text-muted">
          {t(
            "The current page encountered a render error. Please retry; if the problem persists, check the browser console and server logs.",
            "当前页面遇到渲染错误，请重试；如果问题持续，请检查浏览器控制台和服务端日志。",
          )}
        </p>
        {import.meta.env.DEV && (
          <pre className="mb-6 max-h-40 overflow-auto whitespace-pre-wrap break-all border border-ink/10 bg-paper p-3 font-mono text-micro text-ink/80">
            {error.message}
          </pre>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 border border-ink/20 px-5 py-2.5 text-overline font-mono uppercase tracking-widest text-ink hover:border-ink hover:bg-ink/5 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("Reload", "重新加载")}
        </button>
      </section>
    </main>
  );
}
