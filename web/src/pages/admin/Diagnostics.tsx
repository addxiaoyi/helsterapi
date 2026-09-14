import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Pause, Play, RefreshCw, Search, X } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type CallRecord = Record<string, unknown> & {
  id?: number;
  timestamp?: number | string;
  method?: string;
  path?: string;
  status?: number;
  duration?: number;
  user?: string;
  channel?: string;
  model?: string;
};

type ChannelHealth = {
  id?: number;
  name?: string;
  status?: number;
  response_time?: number;
  health?: {
    requests?: number;
    successes?: number;
    failures?: number;
    error_rate?: number;
    last_failure_at?: string;
    consecutive_failures?: number;
    cooldown_until?: string;
  };
};

const PAGE_SIZE = 20;
const REFRESH_INTERVAL_MS = 5000;

function readNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatTime(value: unknown) {
	if (typeof value === "string" && value.trim()) {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString();
	}
	const n = readNumber(value);
  if (n <= 0) return "-";
  return n > 1e12 ? new Date(n).toLocaleString() : new Date(n * 1000).toLocaleString();
}

function statusClass(status: unknown) {
  const n = readNumber(status, 0);
  if (n >= 500) return "border-red-700 bg-red-50 text-red-700";
  if (n >= 400) return "border-yellow-600 bg-yellow-50 text-yellow-700";
  if (n >= 200 && n < 300) return "border-green-700 bg-green-50 text-green-700";
  return "border-[#121110]/20 bg-white text-muted";
}

function extractRecords(payload: unknown): {
  items: CallRecord[];
  nextBeforeId: number | null;
} {
  let items: CallRecord[] = [];
  if (Array.isArray(payload)) {
    items = payload as CallRecord[];
  } else if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.calls)) items = obj.calls as CallRecord[];
    else if (Array.isArray(obj.items)) items = obj.items as CallRecord[];
    else if (Array.isArray(obj.data)) items = obj.data as CallRecord[];
  }
  const lastId = items.length
    ? readNumber(items[items.length - 1].id)
    : 0;
  return {
    items,
    nextBeforeId: items.length === PAGE_SIZE && lastId > 0 ? lastId : null,
  };
}

function exportCsv(calls: CallRecord[]) {
  const headers = ["ID", "Timestamp", "Method", "Path", "Status", "Duration (ms)", "Request Body", "Response Body"];
  const rows = calls.map((c) => [
    c.id ?? "",
    formatTime(c.timestamp),
    c.method ?? "",
    c.path ?? "",
    c.status ?? "",
    c.duration ?? "",
    JSON.stringify(c.requestBody ?? ""),
    JSON.stringify(c.responseBody ?? ""),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `diagnostics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Diagnostics() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [history, setHistory] = useState<CallRecord[][]>([]);
  const [detail, setDetail] = useState<unknown>(null);
  const [callId, setCallId] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelHealth, setChannelHealth] = useState<ChannelHealth[]>([]);
  const [healthError, setHealthError] = useState<string | null>(null);
  const seenRef = useRef<Set<number>>(new Set());
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const rid = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const payload = await api.recentCalls(50);
      const { items, nextBeforeId: next } = extractRecords(payload);
      if (rid !== requestIdRef.current) return; // race guard
      setCalls(items);
      setNextBeforeId(next);
      try {
        const healthPayload = await api.channelHealth();
        const healthItems =
          healthPayload && typeof healthPayload === "object" && Array.isArray((healthPayload as { data?: unknown }).data)
            ? (healthPayload as { data: ChannelHealth[] }).data
            : Array.isArray(healthPayload)
              ? healthPayload as ChannelHealth[]
              : [];
        setChannelHealth(healthItems);
        setHealthError(null);
      } catch (cause) {
        setHealthError(
          cause instanceof ApiError
            ? cause.message
            : t("Unable to load channel health.", "无法加载渠道健康状态。"),
        );
      }
    } catch (cause) {
      if (rid !== requestIdRef.current) return;
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load recent calls.", "无法加载最近调用。");
      setError(message);
      toast.error({ message });
    } finally {
      if (rid === requestIdRef.current) setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const handle = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [autoRefresh, refresh]);

  async function loadDetail(id: number) {
    setLoading(true);
    setError(null);
    try {
      setDetail(await api.recentCall(id));
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load call detail.", "无法加载调用详情。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }

  async function loadById(event?: React.FormEvent) {
    event?.preventDefault();
    const id = readNumber(callId);
    if (!Number.isInteger(id) || id <= 0) {
      const message = t("Enter a valid call ID.", "请输入有效调用 ID。");
      setError(message);
      toast.error({ message });
      return;
    }
    await loadDetail(id);
  }

  async function loadOlder() {
    if (!nextBeforeId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await api.recentCalls(50, nextBeforeId);
      const { items, nextBeforeId: next } = extractRecords(payload);
      if (items.length === 0) {
        setNextBeforeId(null);
        return;
      }
      setHistory((current) => [...current, calls]);
      setCalls(items);
      setNextBeforeId(next);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load older calls.", "无法加载更早的调用。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setCalls((current) => {
      if (history.length === 0) return current;
      const previous = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      return previous;
    });
  }

  function newIdsSeen() {
    const newOnes = calls.filter((item) => {
      const id = readNumber(item.id);
      if (!id || seenRef.current.has(id)) return false;
      seenRef.current.add(id);
      return true;
    });
    return newOnes;
  }

  const fresh = useMemo(() => {
    seenRef.current.clear();
    return newIdsSeen();
  }, [calls]);

  const coolingChannels = channelHealth.filter((item) => {
    const until = item.health?.cooldown_until;
    return Boolean(until && new Date(until).getTime() > Date.now());
  });
  const highErrorChannels = channelHealth.filter((item) => readNumber(item.health?.error_rate) >= 0.5 && readNumber(item.health?.requests) >= 2);

  return (
    <PageContainer
      title={t("Request Diagnostics", "请求诊断")}
      subtitle={t(
        "Inspect the short-lived administrator diagnostic buffer with auto-refresh and pagination.",
        "查看短期保留的管理员诊断调用记录，支持自动刷新和分页。",
      )}
      isLoading={loading}
      error={error}
      onRetry={refresh}
      actions={
        <>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("Refresh", "刷新")}
          </button>
          <button
            type="button"
            onClick={() => setAutoRefresh((active) => !active)}
            className={`flex items-center gap-2 border px-4 py-2 text-overline font-mono uppercase ${
              autoRefresh
                ? "border-[#121110] bg-inverse text-[#FAFAFA]"
                : "border-[#121110]/20 hover:border-[#121110]"
            }`}
          >
            {autoRefresh ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {autoRefresh ? t("Auto Refresh On", "自动刷新开") : t("Auto Refresh", "自动刷新")}
          </button>
          <button
            type="button"
            onClick={() => exportCsv(calls)}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
          >
            <Download className="h-3.5 w-3.5" />
            {t("Export CSV", "导出 CSV")}
          </button>
        </>
      }
    >
      <form onSubmit={loadById} className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 border-b border-[#121110]/20 px-2 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            type="number"
            min="1"
            value={callId}
            onChange={(event) => setCallId(event.target.value)}
            placeholder={t("Call ID", "调用 ID")}
            className="w-36 bg-transparent text-[12px] outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={!callId || loading}
          className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            {t("Open detail", "查看详情")}
          </button>
        </form>
        {history.length > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
          >
            {t("Back", "返回")} ({history.length})
          </button>
        )}
        {nextBeforeId && (
          <button
            type="button"
            onClick={() => void loadOlder()}
            disabled={loading}
            className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            {t("Load older", "加载更早")}
          </button>
        )}
        {calls.length > 0 && (
          <span className="text-overline font-mono uppercase tracking-widest text-muted">
            {t(`Showing ${calls.length} calls`, `共 ${calls.length} 条调用`)}
            {fresh.length > 0
              ? ` · +${fresh.length} ${t("new", "新")}`
              : ""}
          </span>
        )}
      <div className="flex flex-wrap items-center gap-3">
        {history.length > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
          >
            {t("Back", "返回")} ({history.length})
          </button>
        )}
        {nextBeforeId && (
          <button
            type="button"
            onClick={() => void loadOlder()}
            disabled={loading}
            className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            {t("Load older", "加载更早")}
          </button>
        )}
        {calls.length > 0 && (
          <span className="text-overline font-mono uppercase tracking-widest text-muted">
            {t(`Showing ${calls.length} calls`, `共 ${calls.length} 条调用`)}
            {fresh.length > 0
              ? ` · +${fresh.length} ${t("new", "新")}`
              : ""}
          </span>
        )}
      </div>

      <section className="border border-[#121110]/10 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-lg">{t("Channel health", "渠道健康")}</h3>
          <span className="text-caption text-muted">
            {t(`${channelHealth.length} channels`, `${channelHealth.length} 个渠道`)}
          </span>
        </div>
        {coolingChannels.length > 0 || highErrorChannels.length > 0 ? (
          <div role="alert" className="mb-3 border-l-2 border-yellow-600 bg-yellow-50 px-3 py-2 text-caption text-yellow-700">
            {t(
              `${coolingChannels.length + highErrorChannels.length} channel health alert(s) require attention.`,
              `${coolingChannels.length + highErrorChannels.length} 个渠道健康告警需要处理。`,
            )}
          </div>
        ) : null}
        {healthError ? (
          <p className="border-l-2 border-yellow-600 bg-yellow-50 px-3 py-2 text-caption text-yellow-700">
            {healthError}
          </p>
        ) : channelHealth.length === 0 ? (
          <p className="text-caption text-muted">{t("No channel health data.", "暂无渠道健康数据。")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {channelHealth.map((item) => {
              const health = item.health ?? {};
              const failures = readNumber(health.failures);
              const cooling = Boolean(health.cooldown_until && new Date(health.cooldown_until).getTime() > Date.now());
              return (
                <div key={item.id} className="border border-[#121110]/10 p-3 text-caption">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{item.name || `#${item.id ?? "-"}`}</span>
                    <span className={`border px-2 py-0.5 text-overline ${cooling ? "border-red-700 bg-red-50 text-red-700" : "border-green-700 bg-green-50 text-green-700"}`}>
                      {cooling ? t("Cooling", "冷却中") : t("Ready", "可用")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-muted">
                    <span>{t("Latency", "延迟")}: {readNumber(item.response_time) || "-"}{readNumber(item.response_time) ? "ms" : ""}</span>
                    <span>{t("Status", "状态")}: {item.status ?? "-"}</span>
                    <span>{t("Requests", "请求")}: {readNumber(health.requests)}</span>
                    <span className={failures > 0 ? "text-red-700" : ""}>{t("Failures", "失败")}: {failures}</span>
                    <span>{t("Error rate", "错误率")}: {(readNumber(health.error_rate) * 100).toFixed(1)}%</span>
                    <span>{t("Last failure", "最近失败")}: {health.last_failure_at ? formatTime(health.last_failure_at) : "-"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-[#121110]/10 bg-white p-5">
          <h3 className="mb-3 font-serif text-lg">
            {t("Call list", "调用列表")}
          </h3>
          {calls.length === 0 ? (
            <p className="text-[12px] text-muted">
              {t("No recent calls in the buffer.", "缓冲区暂无调用记录。")}
            </p>
          ) : (
            <ul className="divide-y divide-[#121110]/5">
              {calls.map((call, index) => {
                const id = readNumber(call.id);
                return (
                  <li
                    key={`${id}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-[12px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-caption text-muted">
                        #{id || "-"}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-overline font-mono uppercase border ${statusClass(call.status)}`}
                      >
                        {String(call.status ?? "-")}
                      </span>
                      <span className="font-mono text-caption">
                        {String(call.method ?? "")}{" "}
                        {String(call.path ?? "")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-caption text-muted">
                      <span>{formatTime(call.timestamp ?? call.created_at)}</span>
                      {id > 0 && (
                        <button
                          type="button"
                          onClick={() => void loadDetail(id)}
                          className="text-[#121110] hover:underline"
                        >
                          {t("Detail", "详情")}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="border border-[#121110]/10 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 font-serif text-lg">
            {t("Detail payload", "详情")}
            {detail !== null && (
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="ml-auto text-muted hover:text-[#121110]"
                aria-label="close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </h3>
          {detail === null ? (
            <p className="text-[12px] text-muted">
              {t(
                "Pick a call or enter a call ID to view its detail.",
                "选择一条调用或输入调用 ID 以查看详情。",
              )}
            </p>
          ) : (
            <pre className="max-h-[40rem] overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
              {JSON.stringify(detail, null, 2)}
            </pre>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
