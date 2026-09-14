import { useCallback, useEffect, useState } from "react";
import { Activity, Download, Filter, RefreshCw, Trash2 } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { api, type ActiveTaskRecord, type ActiveTaskStats } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

const PAGE_SIZE = 10;

function formatTime(timestamp: number) {
  return timestamp > 1e12
    ? new Date(timestamp).toLocaleString()
    : new Date(timestamp * 1000).toLocaleString();
}

function exportCSV(rows: ActiveTaskRecord[]): string {
  const headers = [
    "user_id",
    "username",
    "active_slots",
    "global_active_slots",
    "global_limit",
    "user_limit",
    "created_at",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.user_id,
        r.username ?? "",
        r.active_slots,
        r.global_active_slots,
        r.global_limit,
        r.user_limit,
        r.created_at,
      ]
        .map((value) => {
          const text = String(value).replace(/"/g, '""');
          return /[",\n]/.test(text) ? `"${text}"` : text;
        })
        .join(","),
    );
  }
  return lines.join("\n");
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ActiveTasks() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [stats, setStats] = useState<ActiveTaskStats>();
  const [history, setHistory] = useState<ActiveTaskRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [windowSec, setWindowSec] = useState(30);
  const [userLimitFilter, setUserLimitFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const userLimit = userLimitFilter ? Number(userLimitFilter) : undefined;
      const [activity, records] = await Promise.all([
        api.activeTaskStats(windowSec, userLimit && userLimit > 0 ? userLimit : 50),
        api.activeTaskHistory(page, PAGE_SIZE),
      ]);
      setStats(activity);
      setHistory(records.items ?? []);
      setTotal(records.total ?? 0);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to load task activity.", "无法加载任务活动。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [page, t, toast, windowSec, userLimitFilter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const handle = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(handle);
  }, [autoRefresh, load]);

  function exportCurrent() {
    const csv = exportCSV(history);
    downloadFile(
      `active-tasks-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv;charset=utf-8",
    );
  }

  function applyUserFilter() {
    setPage(1);
    void load();
  }

  async function clearAll() {
    const ok = await confirm({
      title: t("Clear history", "清空历史"),
      description: t(
        "Clear the local task history view? This does not change backend data.",
        "清空当前的任务历史视图？不会修改后端数据。",
      ),
      confirmText: t("Clear", "清空"),
      variant: "default",
    });
    if (!ok) return;
    setHistory([]);
    setTotal(0);
  }

  const columns = [
    { key: "username", title: t("User", "用户"), render: (record: ActiveTaskRecord) => record.username || `#${record.user_id}` },
    { key: "active_slots", title: t("User slots", "用户槽位"), render: (record: ActiveTaskRecord) => record.active_slots },
    { key: "global_active_slots", title: t("Global slots", "全局槽位"), render: (record: ActiveTaskRecord) => record.global_active_slots },
    { key: "created_at", title: t("Recorded at", "记录时间"), render: (record: ActiveTaskRecord) => formatTime(record.created_at) },
  ];

  return (
    <PageContainer
      title={t("Active Tasks", "活跃任务")}
      subtitle={t("Monitor gateway activity and high-load history.", "监控网关活动与高负载历史。")}
      isLoading={loading}
      error={error}
      onRetry={load}
      actions={
        <>
          <label className="flex items-center gap-2 border-b border-[#121110]/20 px-2 py-2 text-caption">
            <Filter className="h-3.5 w-3.5 text-muted" />
            <span className="text-overline font-mono uppercase tracking-widest text-muted">
              {t("User limit", "用户上限")}
            </span>
            <input
              type="number"
              min="0"
              value={userLimitFilter}
              onChange={(event) => setUserLimitFilter(event.target.value)}
              placeholder={t("Optional", "可选")}
              className="w-16 bg-transparent text-caption outline-none"
            />
            <button
              type="button"
              onClick={applyUserFilter}
              className="text-overline font-mono uppercase tracking-widest text-[#121110] hover:text-[#121110]/70"
            >
              {t("Apply", "应用")}
            </button>
          </label>
          <label className="flex items-center gap-2 border-b border-[#121110]/20 px-2 py-2 text-caption">
            <span className="text-overline font-mono uppercase tracking-widest text-muted">
              {t("Window", "窗口")}
            </span>
            <input
              type="number"
              min="5"
              max="300"
              value={windowSec}
              onChange={(event) => setWindowSec(Number(event.target.value) || 30)}
              className="w-14 bg-transparent text-caption outline-none"
            />
            <span className="text-overline font-mono uppercase text-muted">s</span>
          </label>
          <button
            type="button"
            onClick={() => setAutoRefresh((active) => !active)}
            className={`flex items-center gap-2 border px-3 py-2 text-overline font-mono uppercase ${
              autoRefresh
                ? "border-[#121110] bg-inverse text-white"
                : "border-[#121110]/20 text-muted"
            }`}
          >
            {autoRefresh ? t("Auto-refresh ON", "自动刷新 开") : t("Auto-refresh OFF", "自动刷新 关")}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("Refresh", "刷新")}
          </button>
          <button
            type="button"
            onClick={exportCurrent}
            disabled={history.length === 0}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {t("Export", "导出")}
          </button>
          <button
            type="button"
            onClick={() => void clearAll()}
            disabled={history.length === 0}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("Clear", "清空")}
          </button>
        </>
      }
    >
      {stats && <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {[[t("Active slots", "活跃槽位"), `${stats.global_active_slots} / ${stats.global_limit}`], [t("Active users", "活跃用户"), stats.active_users], [t("User limit", "用户上限"), stats.user_limit], [t("Window", "窗口"), `${stats.window_seconds}s`]].map(([label, value]) => <div key={String(label)} className="border border-[#121110]/10 bg-white p-5"><p className="text-overline font-mono uppercase tracking-widest text-muted">{label}</p><p className="mt-3 font-serif text-2xl">{value}</p></div>)}
      </div>}
      <div className="mb-6 border border-[#121110]/10 bg-white p-6"><div className="mb-4 flex items-center gap-3"><Activity className="h-4 w-4" /><h2 className="font-serif text-xl">{t("Current ranking", "当前排行")}</h2></div>{stats?.rank.length ? <div className="space-y-3">{stats.rank.map((entry) => <div key={entry.user_id} className="flex justify-between border-b border-[#121110]/10 pb-3 text-label"><span>{entry.username || `#${entry.user_id}`}</span><span className="font-mono">{entry.active_slots}</span></div>)}</div> : <p className="text-[12px] text-muted">{t("No active users.", "暂无活跃用户。")}</p>}</div>
      <DataTable columns={columns} data={history} total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </PageContainer>
  );
}
