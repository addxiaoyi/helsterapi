import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Activity, Database, Zap, Cpu } from "lucide-react";
import { PageContainer } from "../components/ui/PageContainer";
import { useLang } from "../lib/LanguageContext";
import { useToast } from "../components/ui/Toast";
import { api, type ApiChannel, type ApiPerfMetricSummary } from "../lib/api";
import { useApp } from "../lib/AppContext";
import { BarChart, DonutChart, HorizontalBarChart, LineChart, type ChartSeries } from "../components/charts";
import { TitledCard } from "../components/ui/TitledCard";
import { StaggerGrid, StaggerItem } from "../components/ui/PageTransition";

const DAY_SECONDS = 24 * 60 * 60;
const DASHBOARD_CHANNEL_PAGE_SIZE = 100;
const MAX_DASHBOARD_CHANNEL_PAGES = 100;

function numberValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: unknown): string {
  const parsed = numberValue(value);
  if (parsed == null) return "—";
  const absolute = Math.abs(parsed);
  if (absolute >= 1_000_000) return `${(parsed / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(parsed / 1_000).toFixed(1)}K`;
  return parsed.toLocaleString();
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

function modelName(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const item = value as Record<string, unknown>;
  if (typeof item.model_name === "string") return item.model_name.trim();
  return typeof item.name === "string" ? item.name.trim() : "";
}

export default function Dashboard() {
  const { t } = useLang();
  const { isAdmin } = useApp();
  const location = useLocation();
  const toast = useToast();
  const [stats, setStats] = useState({ quota: 0, rpm: 0, tpm: 0 });
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [modelsByChannel, setModelsByChannel] = useState<Record<string, string[]>>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [performance, setPerformance] = useState<ApiPerfMetricSummary[]>([]);
  const [performanceHours, setPerformanceHours] = useState<24 | 72 | 168>(24);
  const [performanceSearch, setPerformanceSearch] = useState("");
  const [quotaHistory, setQuotaHistory] = useState<Array<{ created_at: number; quota: number; token_used: number; count: number }>>([]);
  const [flowHistory, setFlowHistory] = useState<Array<{ created_at: number; quota: number; token_used: number; count: number }>>([]);
  const [recentLogs, setRecentLogs] = useState<Array<{ created_at: number; quota: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const requestIdRef = useRef(0);
  const dashboardSection = location.pathname.split("/")[2] ?? "overview";
  const sectionTitle = dashboardSection === "models"
    ? t("Model Dashboard", "模型看板")
    : dashboardSection === "users"
      ? t("User Dashboard", "用户看板")
      : t("System Overview", "系统概览");

  const loadDashboard = useCallback(async () => {
    const rid = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    const end = Math.floor(Date.now() / 1000);
    try {
      const [logStats, firstChannelPage, modelMap, performanceSummary, userModelList, quotaDates, flowDates, logPage] =
        await Promise.all([
          isAdmin
            ? api.logStats(end - DAY_SECONDS, end)
            : api.userLogStats(),
          isAdmin
            ? api.channels(1, undefined, DASHBOARD_CHANNEL_PAGE_SIZE)
            : Promise.resolve({
                items: [] as ApiChannel[],
                total: 0,
                page: 1,
                page_size: DASHBOARD_CHANNEL_PAGE_SIZE,
              }),
          isAdmin
            ? api.dashboardModels()
            : api.userModels().then((models) => ({ available: models })),
          api.perfMetricsSummary(performanceHours),
          api.userModels(),
          api.userQuotaDates(end - DAY_SECONDS, end),
          api.userFlowQuotaDates(end - DAY_SECONDS, end),
          api.logs(1, isAdmin, undefined, { startTimestamp: end - DAY_SECONDS, endTimestamp: end, pageSize: 500 }),
        ]);
      const allChannels = [...firstChannelPage.items];
      if (isAdmin) {
        const totalPages = Math.min(
          Math.ceil(firstChannelPage.total / DASHBOARD_CHANNEL_PAGE_SIZE),
          MAX_DASHBOARD_CHANNEL_PAGES,
        );
        for (let page = 2; page <= totalPages; page += 1) {
          const nextPage = await api.channels(page, undefined, DASHBOARD_CHANNEL_PAGE_SIZE);
          allChannels.push(...nextPage.items);
          if (nextPage.items.length === 0) break;
        }
      }
      if (rid !== requestIdRef.current) return;
      setStats(logStats);
      setChannels(allChannels);
      setModelsByChannel(modelMap ?? {});
      setAvailableModels(
        Array.isArray(userModelList)
          ? userModelList.map(modelName).filter(Boolean)
          : [],
      );
      setPerformance(Array.isArray(performanceSummary) ? performanceSummary : []);
      setQuotaHistory(Array.isArray(quotaDates) ? quotaDates : []);
      setFlowHistory(Array.isArray(flowDates) ? flowDates : []);
      setRecentLogs(Array.isArray(logPage?.items) ? logPage.items : []);
    } catch (cause) {
      if (rid !== requestIdRef.current) return;
      setStats({ quota: 0, rpm: 0, tpm: 0 });
      setChannels([]);
      setModelsByChannel({});
      setAvailableModels([]);
      setPerformance([]);
      setQuotaHistory([]);
      setFlowHistory([]);
      setRecentLogs([]);
      setError(
        cause instanceof Error
          ? cause.message
          : t("Unable to load dashboard data.", "无法加载仪表盘数据。"),
      );
    } finally {
      if (rid === requestIdRef.current) setIsLoading(false);
    }
  }, [isAdmin, performanceHours, t]);
  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);
  const activeChannels = channels.filter((c) => c.status === 1).length;
  const modelCount = new Set(
    (availableModels.length > 0 ? availableModels : Object.values(modelsByChannel).flat())
      .filter((model): model is string => typeof model === "string" && model.trim().length > 0),
  ).size;

  const modelRequestCounts = new Map<string, number>();
  for (const log of recentLogs) {
    const name = typeof (log as unknown as { model_name?: unknown }).model_name === "string"
      ? (log as unknown as { model_name: string }).model_name.trim()
      : "";
    if (!name) continue;
    modelRequestCounts.set(name, (modelRequestCounts.get(name) ?? 0) + 1);
  }
  const requestsBarData = [...modelRequestCounts.entries()]
    .sort(([, left], [, right]) => right - left)
    .slice(0, 5)
    .map(([name, count], i) => ({
      label: name.length > 12 ? `${name.slice(0, 12)}…` : name,
      value: count,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  const logBuckets = new Map<number, { quota: number; count: number }>();
  for (const log of recentLogs) {
    const timestamp = numberValue(log.created_at);
    if (timestamp == null) continue;
    const bucket = Math.floor(timestamp / 3600) * 3600;
    const current = logBuckets.get(bucket) ?? { quota: 0, count: 0 };
    current.quota += numberValue(log.quota) ?? 0;
    current.count += 1;
    logBuckets.set(bucket, current);
  }
  const logTrend = [...logBuckets.entries()].sort(([left], [right]) => left - right);
  const trendLabels = logTrend.map(([timestamp]) => new Date(timestamp * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
  const trendSeries: ChartSeries[] = [
    { label: t("Quota", "额度"), color: CHART_COLORS[0], data: logTrend.map(([, bucket]) => bucket.quota) },
    { label: t("Requests", "请求"), color: CHART_COLORS[2], data: logTrend.map(([, bucket]) => bucket.count) },
  ].filter((series) => series.data.length > 1);
  const visiblePerformance = performance.filter((item) =>
    item.model_name.toLowerCase().includes(performanceSearch.trim().toLowerCase()),
  );
  const performanceChartData = visiblePerformance
    .map((item, index) => ({
      label: item.model_name.length > 18 ? `${item.model_name.slice(0, 18)}…` : item.model_name,
      value: item.request_count > 0 ? item.total_latency_ms / item.request_count : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
  const successChartData = visiblePerformance
    .map((item, index) => ({
      label: item.model_name.length > 18 ? `${item.model_name.slice(0, 18)}…` : item.model_name,
      value: item.request_count > 0 ? (item.success_count / item.request_count) * 100 : 0,
      color: CHART_COLORS[(index + 2) % CHART_COLORS.length],
      requestCount: item.request_count,
    }))
    .filter((item) => item.value >= 0 && item.requestCount !== 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
  const performanceWindowLabel = performanceHours === 24 ? "24h" : performanceHours === 72 ? "3d" : "7d";

  // Channel distribution donut (group channels by status).
  const channelDist = (() => {
    const groups: Record<string, number> = { Operational: 0, Degraded: 0, Offline: 0 };
    channels.forEach((c) => {
      if (c.status === 1) groups.Operational += 1;
      else if (c.status === 2) groups.Degraded += 1;
      else groups.Offline += 1;
    });
    return [
      { label: t("Enabled", "已启用"), value: groups.Operational, color: CHART_COLORS[2] },
      { label: t("Degraded status", "降级状态"), value: groups.Degraded, color: CHART_COLORS[4] },
      { label: t("Disabled status", "停用状态"), value: groups.Offline, color: CHART_COLORS[7] },
    ].filter((d) => d.value > 0);
  })();
  const channelStatusRows = [
    { label: t("Enabled", "已启用"), value: channels.filter((c) => c.status === 1).length, color: CHART_COLORS[2] },
    { label: t("Degraded", "降级"), value: channels.filter((c) => c.status === 2).length, color: CHART_COLORS[4] },
    { label: t("Disabled", "停用"), value: channels.filter((c) => c.status !== 1 && c.status !== 2).length, color: CHART_COLORS[7] },
  ];

  const cards = [
    [t("Quota Used (24h)", "额度消耗 (24小时)"), stats.quota, Activity, [], CHART_COLORS[0]],
    [t("Active Channels", "活跃渠道"), activeChannels, Database, [], CHART_COLORS[2]],
    [t("Requests Per Minute", "每分钟请求数"), stats.rpm, Activity, [], CHART_COLORS[1]],
    [t("Tokens Per Minute", "每分钟 Token 数"), stats.tpm, Zap, [], CHART_COLORS[3]],
    [t("Available Models", "可用模型"), modelCount, Cpu, [], CHART_COLORS[4]],
  ] as const;

  return (
    <PageContainer
      title={sectionTitle}
      subtitle={t(
        "Real-time telemetry and operational status of the gateway infrastructure.",
        "网关基础设施的实时遥测和运行状态。",
      )}
      isLoading={isLoading}
      error={error}
      onRetry={loadDashboard}
    >
      {/* Metric cards use only values returned by the gateway. */}
      <StaggerGrid className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value, Icon, spark, color]) => (
          <StaggerItem key={label as string}>
            <div className="ui-panel group relative overflow-hidden p-4 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-paper">
              <span className="absolute inset-y-0 left-0 w-0.5" style={{ backgroundColor: color }} aria-hidden="true" />
              <div className="mb-2 flex items-start justify-between">
                <Icon className="h-4 w-4 text-muted" />
              </div>
              <p className="mb-1 text-overline font-mono uppercase tracking-[0.15em] text-muted">{label}</p>
              <p className="font-pixel text-3xl tracking-tight text-ink">{isLoading ? "—" : (value as number).toLocaleString()}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGrid>

      {/* Charts row: latency line + channel donut + requests bar */}
      <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <TitledCard title={t("Top model requests", "头部模型请求数")} description={t("Request count per model (top 5)", "各模型请求数 (前 5)")} icon={<Activity className="h-4 w-4" />} className="min-h-[250px]" contentClassName="flex min-h-[190px] flex-col">
          <div className="flex flex-1 items-center">
            <BarChart data={requestsBarData} height={180} formatY={(v) => `${v}`} />
          </div>
        </TitledCard>
        <TitledCard title={t("Channel status", "渠道状态")} description={t("Enabled, degraded and disabled channels.", "已启用、降级和停用渠道。") } icon={<Database className="h-4 w-4" />} className="min-h-[250px]">
          <div className="flex flex-1 flex-col justify-center">
            <div className="mb-6 flex h-3 overflow-hidden bg-ink/5" aria-label={t("Channel status distribution", "渠道状态分布")}>
              {channelStatusRows.map((row) => (
                <span
                  key={row.label}
                  className="h-full transition-[width] duration-500"
                  style={{ width: `${channels.length ? (row.value / channels.length) * 100 : 0}%`, backgroundColor: row.color }}
                  title={`${row.label}: ${row.value}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-ink/10 pt-4">
              {channelStatusRows.map((row) => (
                <div key={row.label} className="min-w-0">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
                    <span className="truncate text-micro text-muted">{row.label}</span>
                  </div>
                  <p className="font-pixel text-lg text-ink">{row.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </TitledCard>
        <TitledCard title={t("Channel distribution", "渠道分布")} icon={<Database className="h-4 w-4" />} className="min-h-[250px]">
          <div className="flex flex-1 items-center justify-center">
            <DonutChart segments={channelDist} size={170} thickness={28} />
          </div>
        </TitledCard>
        <TitledCard title={t("Performance trend", "性能趋势")} icon={<Zap className="h-4 w-4" />} className="min-h-[250px]">
          <div className="flex flex-1 items-center">
            <LineChart
              series={trendSeries}
              labels={trendLabels}
              height={180}
              formatY={formatNumber}
              showDots
            />
          </div>
        </TitledCard>
      </div>

      <TitledCard
        title={t(`Latency by model (${performanceWindowLabel})`, `模型平均延迟（${performanceWindowLabel}）`)}
        description={t("Average total request latency from recorded gateway samples.", "来自网关记录样本的平均请求总耗时。")}
        icon={<Activity className="h-4 w-4" />}
        className="mb-5"
        action={
          <div className="flex items-center gap-1" role="group" aria-label={t("Performance time range", "性能时间范围")}>
            {([24, 72, 168] as const).map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => setPerformanceHours(hours)}
                className={`border px-2 py-1 text-micro font-mono ${performanceHours === hours ? "border-ink bg-inverse text-white" : "border-ink/15 text-muted hover:border-ink/40"}`}
              >
                {hours === 24 ? "24h" : hours === 72 ? "3d" : "7d"}
              </button>
            ))}
          </div>
        }
      >
        <div className="mb-4 flex justify-end">
          <input
            value={performanceSearch}
            onChange={(event) => setPerformanceSearch(event.target.value)}
            placeholder={t("Filter models", "筛选模型")}
            aria-label={t("Filter performance models", "筛选性能模型")}
            className="w-full max-w-xs border-b border-ink/20 bg-transparent px-1 py-2 text-caption outline-none focus:border-ink"
          />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <p className="mb-3 text-micro font-mono uppercase tracking-widest text-muted">{t("Average latency", "平均延迟")} · ms</p>
            <HorizontalBarChart data={performanceChartData} height={Math.max(180, performanceChartData.length * 38)} formatValue={(value) => `${Math.round(value)} ms`} />
          </div>
          <div>
            <p className="mb-3 text-micro font-mono uppercase tracking-widest text-muted">{t("Success rate", "成功率")} · %</p>
            <HorizontalBarChart data={successChartData} height={Math.max(180, successChartData.length * 38)} formatValue={(value) => `${value.toFixed(1)}%`} />
          </div>
        </div>
      </TitledCard>

      {/* Model availability */}
      <TitledCard
        title={t("Model Availability", "模型可用性")}
        description={`${modelCount} ${t("unique models", "个模型")}`}
        icon={<Cpu className="h-4 w-4" />}
        className="mb-5"
      >
        {Object.keys(modelsByChannel).length === 0 ? (
          <p className="py-8 text-center text-caption text-muted">
            {modelCount > 0
              ? t(
                  "The model catalog is available, but channel routing details are not available.",
                  "模型目录已有数据，但暂无按渠道展开的路由明细。",
                )
              : t("No model routing data available.", "暂无模型路由数据。")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Object.entries(modelsByChannel).map(([channelId, models]) => {
              const list = (models ?? []).filter(Boolean);
              const isExpanded = expandedChannels.has(channelId);
              const visible = isExpanded ? list : list.slice(0, 5);
              const hidden = list.length - visible.length;
              return (
                <div
                  key={channelId}
                  className="border-b border-ink/10 py-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-overline font-mono uppercase text-muted">
                      {t("Channel", "渠道")} {channelId}
                      <span className="ml-2 normal-case text-muted/80">
                        ({list.length})
                      </span>
                    </p>
                    {hidden > 0 && (
                      <button
                        onClick={() => {
                          setExpandedChannels((prev) => {
                            const next = new Set(prev);
                            if (next.has(channelId)) {
                              next.delete(channelId);
                            } else {
                              next.add(channelId);
                            }
                            return next;
                          });
                        }}
                        className="ml-auto text-caption text-muted transition-colors hover:text-ink"
                      >
                        {isExpanded ? "− less" : `+${hidden} more`}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {visible.length === 0 ? (
                      <span className="text-label text-muted">-</span>
                    ) : (
                      visible.map((model) => (
                        <button
                          key={model}
                          onClick={() => {
                            navigator.clipboard.writeText(model).then(() => {
                              toast.info({
                                message: `${t("Copied", "已复制")} ${model}`,
                                duration: 1500,
                              });
                            });
                          }}
                          className="inline-flex cursor-pointer items-center border border-ink/10 bg-ink/5 px-2 py-0.5 font-mono text-caption text-ink/80 max-w-[180px] truncate transition-colors hover:bg-ink/10 hover:text-ink"
                          title={t("Copy model name", "点击复制模型名")}
                        >
                          {model}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TitledCard>

      {/* Performance table */}
      <TitledCard
        title={t(`Model Performance (${performanceWindowLabel})`, `模型性能（${performanceWindowLabel}）`)}
        description={`${visiblePerformance.length} ${t("models", "个模型")}`}
        icon={<Zap className="h-4 w-4" />}
      >
        {performance.length === 0 ? (
          <p className="py-8 text-center text-caption text-muted">
            {t("No performance data available.", "暂无性能数据。")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-ink/10 text-overline font-mono uppercase tracking-widest text-muted">
                  <th className="pb-3 pr-4">{t("Model", "模型")}</th>
                  <th className="pb-3 pr-4">{t("Requests", "请求")}</th>
                  <th className="pb-3 pr-4">{t("Success", "成功率")}</th>
                  <th className="pb-3 pr-4">{t("Avg latency", "平均延迟")}</th>
                  <th className="pb-3">{t("Output tokens", "输出 Token")}</th>
                </tr>
              </thead>
              <tbody>
                {visiblePerformance.map((item) => {
                  const requestCount = numberValue(item.request_count);
                  const successCount = numberValue(item.success_count);
                  const latency = numberValue(item.total_latency_ms);
                  const outputTokens = numberValue(item.output_tokens);
                  const successRate =
                    requestCount != null && requestCount > 0 && successCount != null
                      ? (successCount / requestCount) * 100
                      : null;
                  const avgLatency =
                    requestCount != null && requestCount > 0 && latency != null
                      ? latency / requestCount
                      : null;
                  return (
                    <tr
                      key={item.model_name}
                      className="border-b border-ink/5 text-caption"
                    >
                      <td className="py-3 pr-4 font-mono">{item.model_name}</td>
                      <td className="py-3 pr-4">
                        {formatNumber(requestCount)}
                      </td>
                      <td className="py-3 pr-4">{successRate == null ? "—" : `${successRate.toFixed(1)}%`}</td>
                      <td className="py-3 pr-4">{avgLatency == null ? "—" : `${avgLatency.toFixed(0)} ms`}</td>
                      <td className="py-3">
                        {formatNumber(outputTokens)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TitledCard>
    </PageContainer>
  );
}
