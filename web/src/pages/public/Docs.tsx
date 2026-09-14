import { useState } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/ui/PageContainer";
import { PublicFooter } from "../../components/ui/PublicFooter";
import { useLang } from "../../lib/LanguageContext";

export default function Docs() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);
  const baseUrl = `${window.location.origin}/v1`;
  const examples = {
    base: baseUrl,
    curl: `curl ${baseUrl}/chat/completions \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"MODEL_ID","messages":[{"role":"user","content":"Hello"}]}'`,
  };
  async function copy(value: string, id: string) {
    try { await navigator.clipboard.writeText(value); setCopied(id); window.setTimeout(() => setCopied(null), 2000); }
    catch { setCopied(null); }
  }
  return <div className="px-6 pb-12 pt-24"><div className="mx-auto mb-8 w-full max-w-6xl"><button onClick={() => navigate(-1)} className="flex items-center gap-3 text-overline font-mono uppercase tracking-[0.2em] text-muted"><ArrowLeft className="h-3.5 w-3.5" />{t("Back", "返回")}</button></div><PageContainer title={t("Developer API", "开发者 API")} subtitle={t("Use the gateway with an OpenAI-compatible client.", "使用兼容 OpenAI 的客户端接入网关。")}><div className="max-w-4xl space-y-12"><section><h2 className="mb-4 font-serif text-2xl">{t("Authentication", "认证方式")}</h2><p className="mb-4 text-body leading-relaxed text-muted">{t("Create an access token in the console and send it as a Bearer token.", "在控制台创建访问令牌，并作为 Bearer Token 发送。")}</p><code className="border border-[#121110]/10 bg-white px-4 py-2 text-[12px]">Authorization: Bearer $API_KEY</code></section><section><h2 className="mb-4 font-serif text-2xl">{t("Base URL", "接口地址")}</h2><div className="flex items-center justify-between border border-[#121110]/10 bg-inverse p-4 text-label text-white"><code>{examples.base}</code><button onClick={() => void copy(examples.base, "base")} title={t("Copy", "复制")}>{copied === "base" ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}</button></div></section><section><h2 className="mb-4 font-serif text-2xl">{t("Chat Completions", "聊天补全")}</h2><div className="flex items-start justify-between border border-[#121110]/10 bg-inverse p-4 text-[12px] text-white"><pre className="overflow-x-auto whitespace-pre-wrap">{examples.curl}</pre><button onClick={() => void copy(examples.curl, "curl")} title={t("Copy", "复制")} className="ml-4 shrink-0">{copied === "curl" ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}</button></div></section></div></PageContainer><PublicFooter /></div>;
}
