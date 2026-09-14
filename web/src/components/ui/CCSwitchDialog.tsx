import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLang } from "../../lib/LanguageContext";
import { SelectMenu } from "./SelectMenu";

type AppType = "claude" | "codex" | "gemini";
const defaults: Record<AppType, string> = { claude: "My Claude", codex: "My Codex", gemini: "My Gemini" };

export function CCSwitchDialog({ open, tokenKey, models, onClose }: { open: boolean; tokenKey: string; models: string[]; onClose: () => void }) {
  const { t } = useLang();
  const [app, setApp] = useState<AppType>("claude");
  const [name, setName] = useState(defaults.claude);
  const [model, setModel] = useState("");
  useEffect(() => { if (open) { setApp("claude"); setName(defaults.claude); setModel(models[0] ?? ""); } }, [open, models]);
  if (!open) return null;
  function importConfig() {
    if (!model) return;
    const address = window.location.origin.replace(/\/$/, "");
    const params = new URLSearchParams({ resource: "provider", app, name: name.trim() || defaults[app], endpoint: app === "codex" ? `${address}/v1` : address, apiKey: tokenKey.startsWith("sk-") ? tokenKey : `sk-${tokenKey}`, model, homepage: address, enabled: "true" });
    window.open(`ccswitch://v1/import?${params.toString()}`, "_blank");
    onClose();
  }
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-inverse/40 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby="ccswitch-title" className="flex max-h-[min(720px,calc(100dvh-1rem))] w-full max-w-lg flex-col overflow-hidden border border-[#121110]/10 bg-primary shadow-xl sm:max-h-[calc(100dvh-2rem)]"><div className="flex shrink-0 items-center justify-between border-b border-[#121110]/10 px-5 py-4 sm:px-8"><h2 id="ccswitch-title" className="font-serif text-2xl">{t("Import to CC Switch", "导入到 CC Switch")}</h2><button type="button" onClick={onClose} className="icon-btn" title={t("Close", "关闭")}><X className="h-4 w-4" /></button></div><div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6"><div className="space-y-5"><label className="block space-y-2 text-overline font-mono uppercase"><span>{t("Application", "应用")}</span><div className="flex flex-wrap gap-x-5 gap-y-2 text-caption normal-case">{(["claude", "codex", "gemini"] as const).map((item) => <label key={item} className="flex items-center gap-2"><input type="radio" name="ccswitch-app" checked={app === item} onChange={() => { setApp(item); setName(defaults[item]); }} />{item[0].toUpperCase() + item.slice(1)}</label>)}</div></label><label className="block space-y-2 text-overline font-mono uppercase"><span>{t("Name", "名称")}</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none" /></label><label className="block space-y-2 text-overline font-mono uppercase"><span>{t("Primary model", "主模型")}</span><SelectMenu value={model} onChange={setModel} options={models.map((item) => ({ value: item, label: item }))} /></label></div></div><div className="flex shrink-0 justify-end gap-3 border-t border-[#121110]/10 bg-primary/95 px-5 py-4 backdrop-blur-sm sm:px-8"><button type="button" onClick={onClose} className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase">{t("Cancel", "取消")}</button><button type="button" disabled={!model} onClick={importConfig} className="bg-inverse px-5 py-2 text-overline font-mono uppercase text-white disabled:opacity-50">{t("Open CC Switch", "打开 CC Switch")}</button></div></div></div>;
}
