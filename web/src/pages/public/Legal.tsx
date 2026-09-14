import { useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import { api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

export default function Legal({ type }: { type: "terms" | "privacy" }) {
  const { t } = useLang();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const title = type === "terms" ? t("Terms of Service", "服务条款") : t("Privacy Policy", "隐私政策");
  useEffect(() => {
    setContent("");
    setError(null);
    const load = type === "terms" ? api.userAgreement : api.privacyPolicy;
    void load().then(setContent).catch((cause) => setError(cause instanceof Error ? cause.message : t("Unable to load this document.", "无法加载此文档。")));
  }, [type, t]);
  return <div className="min-h-screen bg-primary px-6 pb-24 pt-32 md:px-12 lg:px-24"><div className="mx-auto max-w-3xl"><PageContainer title={title} error={error}><div className="prose prose-sm max-w-none whitespace-pre-wrap text-muted">{content || t("No document has been published.", "尚未发布文档。")}</div></PageContainer></div></div>;
}
