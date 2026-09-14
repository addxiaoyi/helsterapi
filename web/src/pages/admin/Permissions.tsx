import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Shield } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

export default function Permissions() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [catalog, setCatalog] = useState<{ resources: unknown[]; roles: unknown[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCatalog(await api.permissionCatalog());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to load permission catalog.", "无法加载权限目录。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function downloadJSON() {
    if (!catalog) return;
    const blob = new Blob([JSON.stringify(catalog, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `permission-catalog-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const filteredResources = (catalog?.resources ?? []).filter((r) => {
    if (!filter) return true;
    const text = JSON.stringify(r).toLowerCase();
    return text.includes(filter.toLowerCase());
  });

  const filteredRoles = (catalog?.roles ?? []).filter((r) => {
    if (!filter) return true;
    const text = JSON.stringify(r).toLowerCase();
    return text.includes(filter.toLowerCase());
  });

  return (
    <PageContainer
      title={t("Permission Catalog", "权限目录")}
      subtitle={t("The authorization schema currently published by the server.", "当前服务端发布的授权 schema。")}
      isLoading={loading}
      error={error}
      onRetry={load}
      actions={
        <>
          <label className="flex items-center gap-2 border-b border-[#121110]/20 px-2 py-2 text-caption">
            <span className="text-overline font-mono uppercase tracking-widest text-muted">
              {t("Filter", "过滤")}
            </span>
            <input
              type="text"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={t("Search", "搜索")}
              className="w-32 bg-transparent text-caption outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("Refresh", "刷新")}
          </button>
          <button
            type="button"
            onClick={downloadJSON}
            disabled={!catalog}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {t("Export", "导出")}
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2 border-l-2 border-amber-600 bg-amber-50 px-4 py-3 text-caption text-amber-900">
          {t("Read-only catalog: this server exposes no permission write endpoint, so editing is unavailable.", "只读权限目录：当前服务端未提供权限写入接口，因此编辑功能不可用。")}
        </div>
        <section className="border border-[#121110]/10 bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 font-serif text-xl">
            <Shield className="h-4 w-4" />
            {t("Resources and actions", "资源与动作")}
            <span className="ml-auto text-caption text-muted">{filteredResources.length}</span>
          </h2>
          {filteredResources.length ? (
            <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
              {JSON.stringify(filteredResources, null, 2)}
            </pre>
          ) : (
            <p className="text-[12px] text-muted">{t("No resources returned.", "暂无资源。")}</p>
          )}
        </section>
        <section className="border border-[#121110]/10 bg-white p-6">
          <h2 className="mb-5 font-serif text-xl">
            {t("Role baselines", "角色基线")}
            <span className="ml-2 text-caption text-muted">{filteredRoles.length}</span>
          </h2>
          {filteredRoles.length ? (
            <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
              {JSON.stringify(filteredRoles, null, 2)}
            </pre>
          ) : (
            <p className="text-[12px] text-muted">{t("No roles returned.", "暂无角色。")}</p>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
