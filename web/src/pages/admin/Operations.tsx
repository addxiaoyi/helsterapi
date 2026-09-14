import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Database,
  Download,
  FileText,
  Layers,
  Network,
  RefreshCw,
  Server,
  Trash2,
  Zap,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type Panel = "performance" | "tasks" | "instances" | "ratios" | "logs" | "backups";

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function extractLines(payload: unknown): string[] {
  if (typeof payload === "string") return payload.split("\n").filter(Boolean);
  if (Array.isArray(payload)) {
    return payload
      .map((line) => (typeof line === "string" ? line : JSON.stringify(line)))
      .filter(Boolean);
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.lines)) {
      return obj.lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l)));
    }
    if (Array.isArray(obj.logs)) {
      return obj.logs.map((l) => (typeof l === "string" ? l : JSON.stringify(l)));
    }
    if (typeof obj.content === "string") return obj.content.split("\n");
  }
  return [];
}

export default function Operations() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [panel, setPanel] = useState<Panel>("performance");
  const [payload, setPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cleanupDate, setCleanupDate] = useState("");
  const [taskId, setTaskId] = useState("");
  const [taskType, setTaskType] = useState("");
  const [ratioIds, setRatioIds] = useState("");
  const [ratioTimeout, setRatioTimeout] = useState("10");
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [backupId, setBackupId] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      let value: unknown;
      if (panel === "tasks") value = await api.systemTasks();
      else if (panel === "instances") value = await api.systemInstances();
      else if (panel === "ratios") value = await api.syncableChannels();
      else if (panel === "logs") value = await api.performanceLogs();
      else if (panel === "backups") value = await api.backups();
      else value = await api.performanceStats();
      setPayload(value);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load operations data.", "无法加载运维数据。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [panel, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [payload, panel]);

  async function runAction(action: string, fn: () => Promise<unknown>, requireConfirm: string | null = null) {
    if (requireConfirm && confirmAction !== action) {
      setConfirmAction(action);
      return;
    }
    setConfirmAction(null);
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      setMessage(t("Operation completed.", "操作已完成。"));
      toast.success({ message: t("Operation completed", "操作完成") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Operation failed.", "操作失败。");
      setError(message);
      toast.error({ message });
      setLoading(false);
    }
  }

  const tabs: Array<[Panel, string, string]> = [
    ["performance", "Performance", "性能"],
    ["tasks", "System Tasks", "系统任务"],
    ["instances", "Instances", "实例"],
    ["ratios", "Ratio Sync", "比例同步"],
    ["logs", "Log Files", "日志文件"],
    ["backups", "Backups", "备份"],
  ];

  const performanceCards = [
    {
      label: t("Heap allocated", "堆分配"),
      value: formatBytes(readNumber((payload as Record<string, unknown>)?.memory_alloc)),
    },
    {
      label: t("System memory", "系统内存"),
      value: formatBytes(readNumber((payload as Record<string, unknown>)?.memory_sys)),
    },
    {
      label: t("Goroutines", "协程数"),
      value: String(readNumber((payload as Record<string, unknown>)?.goroutines ?? (payload as Record<string, unknown>)?.num_goroutine)),
    },
    {
      label: t("GC runs", "GC 次数"),
      value: String(readNumber((payload as Record<string, unknown>)?.num_gc ?? (payload as Record<string, unknown>)?.gc_runs)),
    },
  ];

  function downloadLogs() {
    const lines = extractLines(payload);
    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `operations-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer
      title={t("Operations Center", "运维中心")}
      subtitle={t(
        "Inspect and maintain the running service.",
        "查看并维护正在运行的服务。",
      )}
      actions={
        <>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("Refresh", "刷新")}
          </button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2 border-b border-[#121110]/10 pb-4">
        {tabs.map(([id, en, zh]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setPanel(id);
              setConfirmAction(null);
            }}
            className={`flex items-center gap-2 border px-4 py-2 text-overline font-mono uppercase ${
              panel === id ? "border-[#121110] bg-inverse text-white" : "border-[#121110]/15"
            }`}
          >
            {id === "performance" ? (
              <BarChart3 className="h-3.5 w-3.5" />
            ) : id === "tasks" ? (
              <Layers className="h-3.5 w-3.5" />
            ) : id === "instances" ? (
              <Server className="h-3.5 w-3.5" />
            ) : id === "ratios" ? (
              <Network className="h-3.5 w-3.5" />
            ) : id === "backups" ? (
              <Database className="h-3.5 w-3.5" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            {t(en, zh)}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-6 border-l-2 border-red-600 bg-red-50 p-3 text-[12px] text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-6 border-l-2 border-green-700 bg-green-50 p-3 text-[12px] text-green-800">
          {message}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {panel === "performance" && (
          <>
            <button
              type="button"
              onClick={() => setConfirmAction("gc")}
              disabled={loading}
              className={`flex items-center gap-2 border px-4 py-2 text-overline font-mono uppercase disabled:opacity-50 ${
                confirmAction === "gc"
                  ? "border-red-700 bg-red-50 text-red-700"
                  : "border-[#121110]/20"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              {confirmAction === "gc"
                ? t("Confirm GC?", "确认 GC？")
                : t("Run GC", "执行 GC")}
            </button>
            {confirmAction === "gc" && (
              <button
                type="button"
                onClick={() => void runAction("gc", api.forceGc)}
                className="flex items-center gap-2 border border-red-700 bg-red-700 px-4 py-2 text-overline font-mono uppercase text-white"
              >
                {t("Run Now", "立即执行")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmAction("clear-cache")}
              disabled={loading}
              className={`flex items-center gap-2 border px-4 py-2 text-overline font-mono uppercase disabled:opacity-50 ${
                confirmAction === "clear-cache"
                  ? "border-red-700 bg-red-50 text-red-700"
                  : "border-[#121110]/20"
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              {confirmAction === "clear-cache"
                ? t("Confirm clear?", "确认清理？")
                : t("Clear cache", "清理缓存")}
            </button>
            {confirmAction === "clear-cache" && (
              <button
                type="button"
                onClick={() => void runAction("clear-cache", api.clearDiskCache)}
                className="flex items-center gap-2 border border-red-700 bg-red-700 px-4 py-2 text-overline font-mono uppercase text-white"
              >
                {t("Run Now", "立即执行")}
              </button>
            )}
            <button
              type="button"
              onClick={() => void runAction("reset-stats", api.resetPerformanceStats)}
              disabled={loading}
              className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("Reset stats", "重置统计")}
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction("clean-logs")}
              disabled={loading}
              className={`flex items-center gap-2 border px-4 py-2 text-overline font-mono uppercase disabled:opacity-50 ${
                confirmAction === "clean-logs"
                  ? "border-red-700 bg-red-50 text-red-700"
                  : "border-red-200 text-red-700"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmAction === "clean-logs"
                ? t("Confirm delete?", "确认删除？")
                : t("Clean logs", "清理日志")}
            </button>
            {confirmAction === "clean-logs" && (
              <button
                type="button"
                onClick={() => void runAction("clean-logs", api.cleanupLogs)}
                className="flex items-center gap-2 border border-red-700 bg-red-700 px-4 py-2 text-overline font-mono uppercase text-white"
              >
                {t("Run Now", "立即执行")}
              </button>
            )}
          </>
        )}
        {panel === "tasks" && (
          <>
            <input
              type="date"
              value={cleanupDate}
              onChange={(event) => setCleanupDate(event.target.value)}
              className="border border-[#121110]/20 px-3 py-2 text-caption"
            />
            <button
              type="button"
              disabled={!cleanupDate || loading}
              onClick={() =>
                void runAction("cleanup-task", () =>
                  api.createLogCleanupTask(
                    Math.floor(
                      new Date(`${cleanupDate}T00:00:00Z`).getTime() / 1000,
                    ),
                  ),
                )
              }
              className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              {t("Create log cleanup task", "创建日志清理任务")}
            </button>
            <input
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
              placeholder={t("Task ID", "任务 ID")}
              className="border border-[#121110]/20 px-3 py-2 text-caption"
            />
            <button
              type="button"
              disabled={!taskId.trim() || loading}
              onClick={() =>
                void runAction("get-task", () => api.systemTask(taskId.trim()), null).then(
                  () => undefined,
                )
              }
              className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              {t("Open task", "查看任务")}
            </button>
            <input
              value={taskType}
              onChange={(event) => setTaskType(event.target.value)}
              placeholder={t("Task type", "任务类型")}
              className="border border-[#121110]/20 px-3 py-2 text-caption"
            />
            <button
              type="button"
              disabled={!taskType.trim() || loading}
              onClick={() =>
                void runAction("current-task", () => api.currentSystemTask(taskType.trim()), null)
              }
              className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              {t("Current task", "当前任务")}
            </button>
          </>
        )}
        {panel === "instances" && (
          <button
            type="button"
            onClick={() => setConfirmAction("clear-stale-instances")}
            disabled={loading}
            className={`flex items-center gap-2 border px-4 py-2 text-overline font-mono uppercase disabled:opacity-50 ${
              confirmAction === "clear-stale-instances"
                ? "border-red-700 bg-red-50 text-red-700"
                : "border-red-200 text-red-700"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmAction === "clear-stale-instances"
              ? t("Confirm clear stale?", "确认清理过期？")
              : t("Clear stale instances", "清理过期实例")}
          </button>
        )}
        {panel === "instances" && confirmAction === "clear-stale-instances" && (
          <button
            type="button"
            onClick={() => void runAction("clear-stale", api.clearStaleInstances)}
            className="flex items-center gap-2 border border-red-700 bg-red-700 px-4 py-2 text-overline font-mono uppercase text-white"
          >
            {t("Run Now", "立即执行")}
          </button>
        )}
        {panel === "ratios" && (
          <>
            <input
              value={ratioIds}
              onChange={(event) => setRatioIds(event.target.value)}
              placeholder={t(
                "Channel IDs, comma-separated",
                "渠道 ID，逗号分隔",
              )}
              className="min-w-64 border border-[#121110]/20 px-3 py-2 text-caption"
            />
            <input
              type="number"
              min="1"
              max="300"
              value={ratioTimeout}
              onChange={(event) => setRatioTimeout(event.target.value)}
              placeholder={t("Timeout seconds", "超时秒数")}
              className="w-36 border border-[#121110]/20 px-3 py-2 text-caption"
            />
            <button
              type="button"
              disabled={!ratioIds.trim() || loading}
              onClick={() =>
                void runAction("fetch-ratios", () =>
                  api.fetchUpstreamRatios(
                    ratioIds
                      .split(",")
                      .map((value) => Number(value.trim()))
                      .filter((value) => Number.isInteger(value) && value > 0),
                    Number(ratioTimeout),
                  ),
                )
              }
              className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              {t("Fetch upstream ratios", "抓取上游倍率")}
            </button>
          </>
        )}
        {panel === "backups" && (
          <>
            <button type="button" disabled={loading} onClick={() => void runAction("create-backup", api.createBackup)} className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50">
              <Database className="h-3.5 w-3.5" />{t("Create encrypted backup", "创建加密备份")}
            </button>
            <input value={backupId} onChange={(event) => setBackupId(event.target.value)} placeholder={t("Backup ID", "备份 ID")} className="min-w-64 border border-[#121110]/20 px-3 py-2 text-caption" />
            <button type="button" disabled={!backupId.trim() || loading} onClick={() => void runAction("restore-backup", () => api.restoreBackup(backupId.trim()), "restore-backup")} className="border border-red-200 px-4 py-2 text-overline font-mono uppercase text-red-700 disabled:opacity-50">{confirmAction === "restore-backup" ? t("Confirm restore", "确认恢复") : t("Restore", "恢复")}</button>
            <button type="button" disabled={!backupId.trim() || loading} onClick={() => void runAction("delete-backup", () => api.deleteBackup(backupId.trim()), "delete-backup")} className="border border-red-200 px-4 py-2 text-overline font-mono uppercase text-red-700 disabled:opacity-50">{confirmAction === "delete-backup" ? t("Confirm delete", "确认删除") : t("Delete", "删除")}</button>
          </>
        )}
        {panel === "logs" && extractLines(payload).length > 0 && (
          <button
            type="button"
            onClick={downloadLogs}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
          >
            <Download className="h-3.5 w-3.5" />
            {t("Download", "下载")}
          </button>
        )}
      </div>

      {/* Performance summary cards */}
      {panel === "performance" && payload && typeof payload === "object" && (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {performanceCards.map((card) => (
            <div key={card.label} className="border border-[#121110]/10 bg-white p-4">
              <p className="text-overline font-mono uppercase tracking-widest text-muted">
                {card.label}
              </p>
              <p className="mt-2 text-xl font-serif">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 min-h-48 border border-[#121110]/10 bg-white p-5">
        {loading ? (
          <p className="text-[12px] text-muted">
            {t("Loading...", "加载中...")}
          </p>
        ) : payload === null ||
          (Array.isArray(payload) && payload.length === 0) ? (
          <p className="text-[12px] text-muted">
            {t("No data returned.", "暂无数据。")}
          </p>
        ) : panel === "logs" ? (
          <div ref={logRef} className="max-h-[32rem] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-mono text-caption leading-relaxed text-[#121110]">
              {extractLines(payload).map((line, i) => (
                <div key={i} className="border-b border-[#121110]/5 py-0.5 last:border-0">
                  <span className="mr-2 text-muted">{(i + 1).toString().padStart(4, " ")}</span>
                  {line}
                </div>
              ))}
            </pre>
          </div>
        ) : (
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-all font-mono text-caption text-[#121110]">
            {JSON.stringify(payload, null, 2)}
          </pre>
        )}
      </div>

      {panel === "instances" && confirmAction !== "clear-stale-instances" && (
        <div className="mt-4 flex items-center gap-2 text-caption text-muted">
          <Server className="h-4 w-4" />
          {t(
            "Click \"Clear stale instances\" to remove stale node records.",
            "点击「清理过期实例」以删除过期节点记录。",
          )}
        </div>
      )}

      {panel === "performance" && confirmAction && confirmAction !== "gc" && confirmAction !== "clear-cache" && confirmAction !== "clean-logs" && (
        <div className="mt-4 flex items-center gap-2 border-l-2 border-yellow-600 bg-yellow-50 p-3 text-[12px] text-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          {t("Click the highlighted button again to confirm.", "再次点击高亮按钮以确认。")}
        </div>
      )}
    </PageContainer>
  );
}
