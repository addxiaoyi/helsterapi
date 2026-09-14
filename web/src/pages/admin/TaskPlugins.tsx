import { CheckCircle2, CircleAlert, Loader2, PlugZap, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { PageContainer } from "../../components/ui/PageContainer";
import { useLang } from "../../lib/LanguageContext";

export default function TaskPlugins() {
  const { t } = useLang();
  const toast = useToast();
  const [plugins, setPlugins] = useState<Array<{ id: string; name: string; version: string; description: string; capabilities: string[]; enabled: boolean; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const value = await api.taskPlugins(); const data = value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data) ? (value as { data: typeof plugins }).data : []; setPlugins(data); }
    catch (cause) { const message = cause instanceof ApiError ? cause.message : t("Unable to load task plugins.", "无法加载任务插件。"); setError(message); toast.error({ message }); }
    finally { setLoading(false); }
  }, [t, toast]);
  useEffect(() => { void load(); }, [load]);
  async function toggle(plugin: typeof plugins[number]) { setBusy(plugin.id); try { await api.updateTaskPlugin(plugin.id, !plugin.enabled); setPlugins((items) => items.map((item) => item.id === plugin.id ? { ...item, enabled: !item.enabled, status: !item.enabled ? "available" : "disabled" } : item)); toast.success({ message: t("Plugin status updated.", "插件状态已更新。") }); } catch (cause) { toast.error({ message: cause instanceof Error ? cause.message : t("Unable to update plugin.", "无法更新插件。") }); } finally { setBusy(null); } }
  async function test(plugin: typeof plugins[number]) { setBusy(plugin.id); try { await api.testTaskPlugin(plugin.id); toast.success({ message: t("Plugin check passed.", "插件检查通过。") }); } catch (cause) { toast.error({ message: cause instanceof Error ? cause.message : t("Plugin check failed.", "插件检查失败。") }); } finally { setBusy(null); } }

  return (
    <PageContainer
      title={t("Task Plugins", "任务插件")}
      subtitle={t("Manage pre-registered server task extensions.", "管理服务端预注册任务扩展。")}
      isLoading={loading}
      error={error}
      onRetry={load}
      actions={<button type="button" onClick={() => void load()} disabled={loading} className="flex items-center gap-2 border border-ink/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />{t("Refresh", "刷新")}</button>}
    >
      {plugins.length === 0 && !loading ? <section className="mx-auto max-w-2xl border border-ink/10 bg-paper p-8 text-center"><PlugZap className="mx-auto mb-4 h-8 w-8 text-muted" /><p className="text-label text-muted">{t("No pre-registered task plugins are available.", "暂无可用的预注册任务插件。")}</p></section> : <div className="grid gap-4 md:grid-cols-2">{plugins.map((plugin) => <section key={plugin.id} className="border border-ink/10 bg-paper p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-xl text-ink">{plugin.name}</h2><p className="text-micro font-mono text-muted">{plugin.id} · {plugin.version}</p></div><span className="flex items-center gap-1 border px-2 py-1 text-overline">{plugin.enabled ? <CheckCircle2 className="h-3 w-3 text-green-700" /> : <CircleAlert className="h-3 w-3 text-muted" />}{plugin.status}</span></div><p className="mt-4 text-label text-muted">{plugin.description}</p><div className="mt-4 flex flex-wrap gap-2">{plugin.capabilities.map((capability) => <span key={capability} className="border border-ink/10 px-2 py-1 text-micro text-muted">{capability}</span>)}</div><div className="mt-5 flex gap-2 border-t border-ink/10 pt-4"><button type="button" onClick={() => void toggle(plugin)} disabled={busy === plugin.id} className="border border-ink/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50">{busy === plugin.id ? <Loader2 className="h-3 w-3 animate-spin" /> : plugin.enabled ? t("Disable", "禁用") : t("Enable", "启用")}</button><button type="button" onClick={() => void test(plugin)} disabled={busy === plugin.id || !plugin.enabled} className="border border-ink/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50">{t("Test", "测试")}</button></div></section>)}</div>}
    </PageContainer>
  );
}
