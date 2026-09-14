import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import { useLang } from "../../lib/LanguageContext";
import { ApiError, api } from "../../lib/api";
import { parseChatConfig, resolveChatUrl } from "../../lib/chatLinks";

export default function Chat2Link() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function openLink() {
      try {
        const [tokens, status] = await Promise.all([api.tokens(1), api.status()]);
        const preset = parseChatConfig(status.chats).find((item) => item.type === "web");
        if (!preset) {
          setError(t("No web chat preset is configured.", "尚未配置网页聊天预设。"));
          return;
        }
        const token = tokens.items.find((item) => item.status === 1);
        if (!token) {
          setError(t("No enabled token is available.", "没有可用的启用令牌。"));
          return;
        }
        const key = await api.tokenKey(token.id);
        const url = resolveChatUrl({
          template: preset.url,
          apiKey: key,
          serverAddress: status.server_address ?? window.location.origin,
        });
        if (!url || cancelled) return;
        window.location.assign(url);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof ApiError ? cause.message : t("Unable to create chat link.", "无法创建聊天链接。"));
        }
      }
    }
    void openLink();
    return () => { cancelled = true; };
  }, [t]);

  if (!error) {
    return (
      <PageContainer title={t("Chat2Link", "聊天链接")} subtitle={t("Opening a configured web chat link.", "正在打开已配置的网页聊天链接。")}>
        <div className="flex min-h-48 items-center justify-center gap-3 text-caption text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("Preparing chat link...", "正在准备聊天链接...")}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t("Chat2Link", "聊天链接")}
      subtitle={t(
        "Create a shareable web chat link from a server chat preset.",
        "根据服务端聊天预设创建可分享的网页聊天链接。",
      )}
    >
      <section className="mx-auto max-w-2xl border border-ink/10 bg-paper p-8 text-center shadow-card">
        <ExternalLink className="mx-auto mb-4 h-8 w-8 text-muted" aria-hidden="true" />
        <h2 className="mb-2 font-serif text-xl text-ink">
          {t("Chat link could not be opened", "无法打开聊天链接")}
        </h2>
        <p className="mb-6 text-label leading-relaxed text-muted">
          {error}
        </p>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 border border-ink/20 px-5 py-2.5 text-overline font-mono uppercase tracking-widest text-ink transition-colors hover:border-ink hover:bg-ink/5"
        >
          {t("Open chat", "打开对话")}
        </Link>
      </section>
    </PageContainer>
  );
}
