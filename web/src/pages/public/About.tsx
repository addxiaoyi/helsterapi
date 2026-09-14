import { useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import { PublicFooter } from "../../components/ui/PublicFooter";
import { api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

export default function About() {
  const { t } = useLang();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api.about().then(setContent).catch((cause) => setError(cause instanceof Error ? cause.message : t("Unable to load about page.", "无法加载关于页面。")));
  }, [t]);
  return <div className="min-h-screen bg-primary px-6 pb-12 pt-24"><PageContainer title={t("About Us", "关于我们")} error={error}><div className="prose prose-sm max-w-3xl whitespace-pre-wrap text-[#7A7772]">{content || t("No about content has been published.", "尚未发布关于内容。")}</div></PageContainer><PublicFooter /></div>;
}
