import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Activity,
  Database,
  Download,
  Eye,
  Filter,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { DataTable } from "../components/ui/DataTable";
import { PageContainer } from "../components/ui/PageContainer";
import { api, type ApiLog, type ApiChannel } from "../lib/api";
import { useApp } from "../lib/AppContext";
import { useLang } from "../lib/LanguageContext";
import { useToast } from "../components/ui/Toast";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { SelectMenu } from "../components/ui/SelectMenu";
import { displayChannelName } from "../lib/channelDisplay";
import { HorizontalBarChart, LineChart } from "../components/charts";

const DAY_SECONDS = 24 * 60 * 60;

function formatTime(value: number) {
  if (!value) return "-";
  return new Date(value * 1000).toLocaleString();
}

function formatDuration(ms: number) {
  if (!ms) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatThroughput(log: ApiLog) {
  const seconds = (log.use_time ?? 0) / 1000;
  const tokens = log.completion_tokens ?? 0;
  if (seconds <= 0 || tokens <= 0) return "-";
  return `${(tokens / seconds).toFixed(1)} t/s`;
}

function exportCsv(logs: ApiLog[]): string {
  const headers = [
    "id",
    "created_at",
    "model_name",
    "username",
    "channel",
    "channel_name",
    "ip",
    "request_id",
    "upstream_request_id",
    "token_name",
    "group",
    "is_stream",
    "prompt_tokens",
    "completion_tokens",
    "quota",
    "use_time",
    "type",
  ];
  const rows = logs.map((log) => [
    log.id,
    formatTime(log.created_at),
    log.model_name,
    log.username ?? "",
    log.channel ?? "",
    log.channel_name ?? "",
    log.ip ?? "",
    log.request_id ?? "",
    log.upstream_request_id ?? "",
    log.token_name ?? "",
    log.group ?? "",
    log.is_stream ?? false,
    log.prompt_tokens ?? 0,
    log.completion_tokens ?? 0,
    log.quota,
    log.use_time ?? 0,
    log.type,
  ]);
  return [headers, ...rows]
    .map((cells) =>
      cells
        .map((cell) => {
          const text = String(cell).replace(/"/g, '""');
          return /[",\n]/.test(text) ? `"${text}"` : text;
        })
        .join(","),
    )
    .join("\n");
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function Logs() {
  const { t } = useLang();
  const location = useLocation();
  const logSection = location.pathname.split("/")[2] ?? "common";
  const { isAdmin } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statPayload, setStatPayload] = useState<unknown>(null);

  // Filters
  const [filterModel, setFilterModel] = useState("");
  const [filterUsername, setFilterUsername] = useState("");
  const [filterRequestId, setFilterRequestId] = useState("");
  const [filterTokenName, setFilterTokenName] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterUpstreamRequestId, setFilterUpstreamRequestId] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [rangeHours, setRangeHours] = useState<string>("24");
  const [showFilters, setShowFilters] = useState(false);

  // Detail panel
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [channelError, setChannelError] = useState<string | null>(null);

  // Affinity cache
  const [ruleName, setRuleName] = useState("");
  const [keyFp, setKeyFp] = useState("");
  const [usingGroup, setUsingGroup] = useState("");

  // Load channels for filter (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    setChannelError(null);
    void api
      .channels(1, undefined, 200)
      .then((response) => setChannels(response.items))
      .catch((cause) => {
        console.error("Unable to load channels for log filters", cause);
        setChannelError(
          cause instanceof Error
            ? cause.message
            : t("Unable to load channel filters.", "无法加载渠道筛选项。"),
        );
      });
  }, [isAdmin, t]);

  const computeRange = useCallback(():
    { start: number; end: number } | undefined => {
    const hours = Number(rangeHours);
    if (!Number.isFinite(hours) || hours <= 0) return undefined;
    const end = Math.floor(Date.now() / 1000);
    return { start: end - hours * 3600, end };
  }, [rangeHours]);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const range = computeRange();
      if (logSection === "audit") {
        const audit = await api.auditLogs(isAdmin ? "all" : "self", page, {
          username: filterUsername.trim() || undefined,
          requestId: filterRequestId.trim() || undefined,
          startTimestamp: range?.start,
          endTimestamp: range?.end,
        });
        setLogs(audit.items.map((item) => ({
          id: item.user_id,
          user_id: item.user_id,
          created_at: item.created_at,
          username: item.username,
          content: item.content,
          model_name: item.action ?? item.category ?? "audit",
          token_name: item.token_ref,
          quota: 0,
          ip: item.ip,
          request_id: item.request_id ?? item.event_id,
          type: 3,
          other: JSON.stringify(item.other ?? {}),
        })));
        setTotal(audit.total);
        return;
      }
      const response = await api.logs(page, isAdmin, filterModel.trim() || undefined, {
          username: filterUsername.trim() || undefined,
          channelId: filterChannel ? Number(filterChannel) : undefined,
          startTimestamp: range?.start,
          endTimestamp: range?.end,
          requestId: filterRequestId.trim() || undefined,
          tokenName: filterTokenName.trim() || undefined,
          group: filterGroup.trim() || undefined,
          upstreamRequestId: filterUpstreamRequestId.trim() || undefined,
        },
      );
      setLogs(response.items);
      setTotal(response.total);
    } catch (cause) {
      setLogs([]);
      setTotal(0);
      setError(
        cause instanceof Error
          ? cause.message
          : t("Unable to load logs.", "无法加载调用日志。"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    isAdmin,
    filterModel,
    filterUsername,
    filterChannel,
    filterRequestId,
    filterTokenName,
    filterGroup,
    filterUpstreamRequestId,
    computeRange,
    t,
  ]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const stats = useMemo(() => {
    if (logs.length === 0)
      return { total: 0, prompt: 0, completion: 0, quota: 0, latency: 0 };
    let prompt = 0;
    let completion = 0;
    let quota = 0;
    let latency = 0;
    for (const log of logs) {
      prompt += log.prompt_tokens ?? 0;
      completion += log.completion_tokens ?? 0;
      quota += log.quota ?? 0;
      latency += log.use_time ?? 0;
    }
    return {
      total: logs.length,
      prompt,
      completion,
      quota,
      latency: latency / logs.length,
    };
  }, [logs]);

  const modelVolume = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of logs) {
      const model = log.model_name.trim() || "unknown";
      counts.set(model, (counts.get(model) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([, left], [, right]) => right - left)
      .slice(0, 8)
      .map(([label, value], index) => ({
        label,
        value,
        color: `var(--chart-${(index % 6) + 1})`,
      }));
  }, [logs]);

  const timeline = useMemo(() => {
    const buckets = new Map<number, number>();
    for (const log of logs) {
      if (!Number.isFinite(log.created_at)) continue;
      const bucket = Math.floor(log.created_at / 3600) * 3600;
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
    const points = [...buckets.entries()].sort(([left], [right]) => left - right);
    return {
      labels: points.map(([timestamp]) => new Date(timestamp * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })),
      series: [{
        label: t("Requests", "请求数"),
        color: "var(--chart-1)",
        data: points.map(([, count]) => count),
      }],
    };
  }, [logs, t]);

  async function loadStats() {
    setError(null);
    try {
      const range = computeRange();
      setStatPayload(await api.logStats(range?.start ?? 0, range?.end ?? 0));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load log statistics.", "无法加载日志统计。");
      setError(message);
      toast.error({ message });
    }
  }

  async function clearHistoryLogs() {
    const ok = await confirm({
      title: t("Delete history logs", "删除历史日志"),
      description: t(
        "Permanently delete all request history logs? This cannot be undone.",
        "确定永久删除全部调用历史日志？此操作不可恢复。",
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteHistoryLogs();
      setStatPayload(null);
      await loadLogs();
      toast.success({
        message: t("History logs deleted.", "历史日志已删除。"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to delete history logs.", "无法删除历史日志。");
      setError(message);
      toast.error({ message });
    }
  }

  async function loadAffinityCache() {
    setError(null);
    if (!ruleName.trim() || !keyFp.trim()) {
      toast.info({
        message: t(
          "Rule name and key fingerprint are required.",
          "规则名和键指纹不能为空。",
        ),
      });
      return;
    }
    try {
      setStatPayload(
        await api.logAffinityUsageCache(
          ruleName.trim(),
          keyFp.trim(),
          usingGroup.trim() || undefined,
        ),
      );
      toast.success({
        message: t("Affinity cache loaded", "渠道亲和缓存已加载"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t(
              "Unable to load affinity cache statistics.",
              "无法加载渠道亲和缓存统计。",
            );
      setError(message);
      toast.error({ message });
    }
  }

  function resetFilters() {
    setFilterModel("");
    setFilterUsername("");
    setFilterRequestId("");
    setFilterTokenName("");
    setFilterGroup("");
    setFilterUpstreamRequestId("");
    setFilterChannel("");
    setRangeHours("24");
    setPage(1);
  }

  function applyFilterChange(setter: (value: string) => void) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  function setFilterValue(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function exportCurrent() {
    if (logs.length === 0) {
      toast.info({ message: t("No logs to export", "暂无日志可导出") });
      return;
    }
    const csv = exportCsv(logs);
    const filename = `logs-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(filename, csv);
    toast.success({
      message: t(
        `Exported ${logs.length} logs`,
        `已导出 ${logs.length} 条日志`,
      ),
    });
  }

  const columns = [
    {
      key: "created_at",
      title: t("Time", "时间"),
      render: (log: ApiLog) => (
        <span className="font-mono text-caption">
          {formatTime(log.created_at)}
        </span>
      ),
    },
    {
      key: "request_id",
      title: t("Request ID", "请求 ID"),
      render: (log: ApiLog) => (
        <span className="font-mono text-caption text-[#121110]/60">
          {log.request_id || "-"}
        </span>
      ),
    },
    {
      key: "model_name",
      title: t("Model", "模型"),
      render: (log: ApiLog) => (
        <span className="font-mono text-caption">{log.model_name}</span>
      ),
    },
    {
      key: "channel_name",
      title: t("Channel", "渠道"),
      render: (log: ApiLog) => (
        <span className="text-caption">{displayChannelName(log.channel_name || "")}</span>
      ),
    },
    {
      key: "ip",
      title: "IP",
      render: (log: ApiLog) => (
        <span className="font-mono text-caption text-muted">
          {log.ip || "-"}
        </span>
      ),
    },
    {
      key: "prompt_tokens",
      title: t("Prompt", "输入"),
      render: (log: ApiLog) => (
        <span className="font-mono text-caption">
          {(log.prompt_tokens ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "completion_tokens",
      title: t("Completion", "输出"),
      render: (log: ApiLog) => (
        <span className="font-mono text-caption">
          {(log.completion_tokens ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "quota",
      title: t("Quota", "额度"),
      render: (log: ApiLog) => (
        <span className="font-mono text-caption">
          {(log.quota ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "use_time",
      title: t("Latency", "耗时"),
      render: (log: ApiLog) => (
        <span className="font-mono text-caption">
          {formatDuration(log.use_time ?? 0)}
        </span>
      ),
    },
    {
      key: "throughput",
      title: t("TPS", "吞吐"),
      render: (log: ApiLog) => (
        <span className="font-mono text-caption">{formatThroughput(log)}</span>
      ),
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (log: ApiLog) => (
        <button
          type="button"
          onClick={() => setSelectedLog(log)}
          className="text-muted hover:text-[#121110]"
          title={t("View detail", "查看详情")}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <PageContainer
      title={logSection === "audit" ? t("Audit Logs", "审计日志") : logSection === "task" ? t("Task Logs", "任务日志") : logSection === "drawing" ? t("Drawing Logs", "生图日志") : t("Request Logs", "调用日志")}
      subtitle={t(
        "Audit trail of actual requests handled by the gateway.",
        "网关实际处理请求的审计记录。",
      )}
      isLoading={isLoading}
      error={error}
      onRetry={() => void loadLogs()}
    >
      <div className="mb-4 grid grid-cols-1 gap-px border border-[#121110]/10 bg-inverse/10 md:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white p-5">
          <p className="text-overline font-mono uppercase tracking-widest text-muted">
            {t("Loaded", "已加载")}
          </p>
          <p className="mt-2 text-2xl font-serif">{stats.total}</p>
        </div>
        <div className="bg-white p-5">
          <p className="text-overline font-mono uppercase tracking-widest text-muted">
            {t("Prompt tokens", "输入 tokens")}
          </p>
          <p className="mt-2 text-2xl font-serif">
            {stats.prompt.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-5">
          <p className="text-overline font-mono uppercase tracking-widest text-muted">
            {t("Completion tokens", "输出 tokens")}
          </p>
          <p className="mt-2 text-2xl font-serif">
            {stats.completion.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-5">
          <p className="text-overline font-mono uppercase tracking-widest text-muted">
            {t("Quota", "额度")}
          </p>
          <p className="mt-2 text-2xl font-serif">
            {stats.quota.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-5">
          <p className="text-overline font-mono uppercase tracking-widest text-muted">
            {t("Avg latency", "平均耗时")}
          </p>
          <p className="mt-2 text-2xl font-serif">
            {formatDuration(stats.latency)}
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="border border-[#121110]/10 bg-white p-5">
          <h3 className="mb-3 text-overline font-mono uppercase tracking-widest text-[#121110]">
            {t("Requests by model", "按模型请求数")}
          </h3>
          <HorizontalBarChart data={modelVolume} height={Math.max(180, modelVolume.length * 34)} formatValue={(value) => String(value)} />
        </section>
        <section className="border border-[#121110]/10 bg-white p-5">
          <h3 className="mb-3 text-overline font-mono uppercase tracking-widest text-[#121110]">
            {t("Request timeline", "请求时间趋势")}
          </h3>
          <LineChart series={timeline.series} labels={timeline.labels} height={Math.max(180, timeline.labels.length > 0 ? 220 : 180)} formatY={(value) => String(Math.round(value))} showDots />
        </section>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={filterModel}
          onChange={applyFilterChange(setFilterModel)}
          placeholder={t("Filter by model...", "按模型筛选...")}
          className="min-w-48 border-b border-[#121110]/20 bg-transparent px-2 py-2 text-[12px] outline-none focus:border-[#121110]"
        />
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 border px-3 py-2 text-overline font-mono uppercase ${
            showFilters
              ? "border-[#121110] bg-inverse text-[#FAFAFA]"
              : "border-[#121110]/20 text-[#121110] hover:border-[#121110]"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          {t("More filters", "更多筛选")}
        </button>
        <button
          type="button"
          onClick={() => void loadLogs()}
          className="flex items-center gap-2 border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("Refresh", "刷新")}
        </button>
        <button
          type="button"
          onClick={exportCurrent}
          disabled={logs.length === 0}
          className="flex items-center gap-2 border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {t("Export CSV", "导出 CSV")}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => void loadStats()}
            className="ml-auto flex items-center gap-2 border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
          >
            <Activity className="h-3.5 w-3.5" />
            {t("Server stats", "服务端统计")}
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => void clearHistoryLogs()}
            className="flex items-center gap-2 border border-red-600/40 px-3 py-2 text-overline font-mono uppercase text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("Delete history", "删除历史")}
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mb-4 grid grid-cols-1 gap-3 border border-[#121110]/10 bg-white p-4 md:grid-cols-2 lg:grid-cols-4">
          {channelError && (
            <p className="text-[12px] text-red-700 md:col-span-2 lg:col-span-4">
              {channelError}
            </p>
          )}
          <label className="space-y-1 text-overline font-mono uppercase">
            <span>{t("Username", "用户名")}</span>
            <input
              value={filterUsername}
              onChange={applyFilterChange(setFilterUsername)}
              placeholder={t("Filter by username", "按用户名过滤")}
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-[12px] outline-none"
            />
          </label>
          <label className="space-y-1 text-overline font-mono uppercase">
            <span>{t("Request ID", "请求 ID")}</span>
            <input
              value={filterRequestId}
              onChange={applyFilterChange(setFilterRequestId)}
              placeholder={t("Filter by request id", "按请求 ID 过滤")}
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-[12px] outline-none"
            />
          </label>
          <label className="space-y-1 text-overline font-mono uppercase">
            <span>{t("Channel", "渠道")}</span>
            <SelectMenu value={filterChannel} onChange={(value) => setFilterValue(setFilterChannel, value)} options={[{ value: "", label: t("All channels", "所有渠道") }, ...channels.map((channel) => ({ value: String(channel.id), label: displayChannelName(channel.name) }))]} />
          </label>
          <label className="space-y-1 text-overline font-mono uppercase">
            <span>{t("Token name", "令牌名称")}</span>
            <input
              value={filterTokenName}
              onChange={applyFilterChange(setFilterTokenName)}
              placeholder={t("Filter by token", "按令牌过滤")}
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-[12px] outline-none"
            />
          </label>
          <label className="space-y-1 text-overline font-mono uppercase">
            <span>{t("Group", "分组")}</span>
            <input
              value={filterGroup}
              onChange={applyFilterChange(setFilterGroup)}
              placeholder={t("Filter by group", "按分组过滤")}
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-[12px] outline-none"
            />
          </label>
          <label className="space-y-1 text-overline font-mono uppercase">
            <span>{t("Upstream request ID", "上游请求 ID")}</span>
            <input
              value={filterUpstreamRequestId}
              onChange={applyFilterChange(setFilterUpstreamRequestId)}
              placeholder={t("Filter by upstream ID", "按上游 ID 过滤")}
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-[12px] outline-none"
            />
          </label>
          <label className="space-y-1 text-overline font-mono uppercase">
            <span>{t("Time range", "时间范围")}</span>
            <SelectMenu value={rangeHours} onChange={(value) => setFilterValue(setRangeHours, value)} options={[{ value: "1", label: t("Last 1 hour", "最近 1 小时") }, { value: "6", label: t("Last 6 hours", "最近 6 小时") }, { value: "24", label: t("Last 24 hours", "最近 24 小时") }, { value: "168", label: t("Last 7 days", "最近 7 天") }, { value: "720", label: t("Last 30 days", "最近 30 天") }, { value: "0", label: t("All time", "全部时间") }]} />
          </label>
          <button
            type="button"
            onClick={resetFilters}
            className="col-span-full flex items-center gap-2 self-end border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
          >
            <X className="h-3.5 w-3.5" />
            {t("Reset filters", "重置筛选")}
          </button>
        </div>
      )}

      {isAdmin && (
        <details className="mb-4 border border-[#121110]/10 bg-white p-4">
          <summary className="cursor-pointer text-overline font-mono uppercase tracking-widest text-muted">
            {t("Affinity cache lookup (admin)", "亲和性缓存查询（管理员）")}
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              value={ruleName}
              onChange={(event) => setRuleName(event.target.value)}
              placeholder={t("Affinity rule name", "亲和规则名")}
              className="border-b border-[#121110]/20 bg-transparent px-2 py-2 text-caption outline-none"
            />
            <input
              value={keyFp}
              onChange={(event) => setKeyFp(event.target.value)}
              placeholder={t("Key fingerprint", "密钥指纹")}
              className="border-b border-[#121110]/20 bg-transparent px-2 py-2 text-caption outline-none"
            />
            <input
              value={usingGroup}
              onChange={(event) => setUsingGroup(event.target.value)}
              placeholder={t("Using group (optional)", "使用分组（可选）")}
              className="border-b border-[#121110]/20 bg-transparent px-2 py-2 text-caption outline-none"
            />
            <button
              type="button"
              disabled={!ruleName.trim() || !keyFp.trim()}
              onClick={() => void loadAffinityCache()}
              className="flex items-center gap-2 border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              <Database className="h-3.5 w-3.5" />
              {t("Lookup", "查询")}
            </button>
          </div>
        </details>
      )}

      {statPayload !== null && (
        <pre className="mb-4 max-h-48 overflow-auto whitespace-pre-wrap break-all border border-[#121110]/10 bg-white p-4 font-mono text-caption">
          {JSON.stringify(statPayload, null, 2)}
        </pre>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
        <DataTable
          columns={columns}
          data={logs}
          total={total}
          page={page}
          pageSize={20}
          onPageChange={setPage}
        />
        <aside className="border border-[#121110]/10 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 font-serif text-lg">
            <Eye className="h-4 w-4" />
            {t("Detail", "详情")}
          </h3>
          {selectedLog === null ? (
            <p className="text-[12px] text-muted">
              {t(
                "Click the eye icon on a row to inspect its full payload.",
                "点击行上的眼睛图标查看完整详情。",
              )}
            </p>
          ) : (
            <div className="space-y-2 text-[12px]">
              {(
                [
                  ["ID", selectedLog.id],
                  ["Time", formatTime(selectedLog.created_at)],
                  ["Request ID", selectedLog.request_id],
                  ["Upstream request ID", selectedLog.upstream_request_id],
                  ["Model", selectedLog.model_name],
                  ["Username", selectedLog.username],
                  ["Token", selectedLog.token_name],
                  ["Group", selectedLog.group],
                  ["Channel", displayChannelName(selectedLog.channel_name || "")],
                  ["Channel ID", selectedLog.channel],
                  ["IP", selectedLog.ip],
                  ["Stream", selectedLog.is_stream ? "yes" : "no"],
                  ["Type", selectedLog.type],
                ] as Array<[string, unknown]>
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-[#121110]/5 pb-1.5"
                >
                  <span className="text-overline font-mono uppercase tracking-widest text-muted">
                    {label}
                  </span>
                  <span className="font-mono text-right text-caption">
                    {String(value ?? "-")}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="border border-[#121110]/10 p-2 text-center">
                  <p className="text-overline font-mono uppercase tracking-widest text-muted">
                    {t("Prompt", "输入")}
                  </p>
                  <p className="font-mono text-[12px]">
                    {(selectedLog.prompt_tokens ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="border border-[#121110]/10 p-2 text-center">
                  <p className="text-overline font-mono uppercase tracking-widest text-muted">
                    {t("Completion", "输出")}
                  </p>
                  <p className="font-mono text-[12px]">
                    {(selectedLog.completion_tokens ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="border border-[#121110]/10 p-2 text-center">
                  <p className="text-overline font-mono uppercase tracking-widest text-muted">
                    {t("Quota", "额度")}
                  </p>
                  <p className="font-mono text-[12px]">
                    {(selectedLog.quota ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="border border-[#121110]/10 p-2 text-center">
                <p className="text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Latency", "耗时")}
                </p>
                <p className="font-mono text-[12px]">
                  {formatDuration(selectedLog.use_time ?? 0)}
                </p>
              </div>
              {(selectedLog.content || selectedLog.other) && (
                <details className="border border-[#121110]/10 p-3">
                  <summary className="cursor-pointer text-overline font-mono uppercase tracking-widest text-muted">
                    {t("Raw log payload", "原始日志附加信息")}
                  </summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
                    {JSON.stringify(
                      {
                        content: selectedLog.content,
                        other: selectedLog.other,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              )}
            </div>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}
