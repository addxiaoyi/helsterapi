import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { BarChart3, HeartPulse, RefreshCw, Timer, Zap } from "lucide-react";
import { ChartPanel, HorizontalBarChart, LineChart, type ChartSeries } from "./charts";
import { SelectMenu } from "./ui/SelectMenu";
import { ApiError, api, type ApiPerfMetricGroup, type ApiPricing } from "../lib/api";
import { useLang } from "../lib/LanguageContext";

type Props = { model: ApiPricing };
type MetricKey = "avg_latency_ms" | "success_rate";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function average(groups: ApiPerfMetricGroup[], key: MetricKey) {
  const values = groups
    .map((group) => numberValue(group[key]))
    .filter((value) => value > 0);
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildSeries(groups: ApiPerfMetricGroup[], key: MetricKey): { series: ChartSeries[]; labels: string[] } {
  const timestamps = [...new Set(groups.flatMap((group) => group.series.map((point) => point.ts)))].sort((left, right) => left - right);
  const labels = timestamps.map(formatTime);
  const series = groups.map((group, index) => {
    const values = new Map(group.series.map((point) => [point.ts, numberValue(point[key])]));
    return {
      label: group.group,
      color: COLORS[index % COLORS.length],
      data: timestamps.map((timestamp) => values.get(timestamp) ?? 0),
    };
  });
  return { series, labels };
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="border border-ink/10 bg-paper/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-overline font-mono uppercase tracking-widest text-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="font-mono text-2xl tabular-nums text-ink">{value}</p>
    </div>
  );
}

export default function ModelPerformancePanel({ model }: Props) {
  const { t } = useLang();
  const [group, setGroup] = useState("all");
  const [groups, setGroups] = useState<ApiPerfMetricGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await api.perfMetrics(model.model_name, group === "all" ? undefined : group, 24);
      setGroups(Array.isArray(report.groups) ? report.groups : []);
    } catch (cause) {
      setGroups([]);
      setError(cause instanceof ApiError ? cause.message : t("Unable to load model performance.", "无法加载模型性能数据。"));
    } finally {
      setLoading(false);
    }
  }, [group, model.model_name, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const groupOptions = useMemo(() => {
    const names = new Set([...(model.enable_groups ?? []), ...groups.map((item) => item.group)]);
    return [
      { value: "all", label: t("All groups", "全部分组") },
      ...[...names].filter(Boolean).sort().map((name) => ({ value: name, label: name })),
    ];
  }, [groups, model.enable_groups, t]);
  const latency = useMemo(() => buildSeries(groups, "avg_latency_ms"), [groups]);
  const success = useMemo(() => buildSeries(groups, "success_rate"), [groups]);
  const throughput = useMemo(
    () => groups.map((item, index) => ({ label: item.group, value: numberValue(item.avg_tps), color: COLORS[index % COLORS.length] })).filter((item) => item.value > 0),
    [groups],
  );
  const avgLatency = average(groups, "avg_latency_ms");
  const avgSuccess = average(groups, "success_rate");
  const avgTps = groups.length > 0 ? groups.reduce((sum, item) => sum + numberValue(item.avg_tps), 0) / groups.length : 0;
  const totalRequests = groups.reduce((sum, item) => sum + item.series.reduce((count, point) => count + (numberValue(point.avg_latency_ms) > 0 ? 1 : 0), 0), 0);

  return (
    <div className="mt-8 border-y border-ink/10 bg-primary py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-overline font-mono uppercase tracking-widest text-ink">{t("Model performance", "模型性能")}</h2>
          <p className="mt-2 text-caption text-muted">{t("Actual gateway observations in the last 24 hours.", "最近 24 小时网关实际观测数据。")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[180px]">
            <SelectMenu value={group} options={groupOptions} onChange={setGroup} ariaLabel={t("Performance group", "性能分组")} />
          </div>
          <button type="button" onClick={() => void load()} className="icon-btn" title={t("Refresh performance", "刷新性能数据")} aria-label={t("Refresh performance", "刷新性能数据")}>
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3" aria-label={t("Loading performance", "正在加载性能数据")}>
          {[1, 2, 3].map((item) => <div key={item} className="h-24 border border-ink/10 bg-ink/5" />)}
        </div>
      ) : error ? (
        <div className="border-l-2 border-red-700 bg-red-50 p-4 text-caption text-red-800">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-3 underline underline-offset-4">{t("Retry", "重试")}</button>
        </div>
      ) : groups.length === 0 ? (
        <div className="border border-dashed border-ink/15 p-10 text-center text-caption text-muted">{t("No performance data is available for this model yet.", "该模型暂时没有性能数据。")}</div>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Stat label={t("Average latency", "平均延迟")} value={`${formatNumber(avgLatency)} ms`} icon={Timer} />
            <Stat label={t("Success rate", "成功率")} value={`${formatNumber(avgSuccess)}%`} icon={HeartPulse} />
            <Stat label={t("Throughput", "吞吐")} value={`${formatNumber(avgTps)} t/s`} icon={Zap} />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <ChartPanel title={t("Latency trend · 24h", "延迟趋势 · 24 小时")}>
              <LineChart series={latency.series} labels={latency.labels} height={250} showDots formatY={(value) => `${Math.round(value)}ms`} />
            </ChartPanel>
            <ChartPanel title={t("Success rate trend · 24h", "成功率趋势 · 24 小时")}>
              <LineChart series={success.series} labels={success.labels} height={250} showDots formatY={(value) => `${Math.round(value)}%`} />
            </ChartPanel>
            <ChartPanel title={t("Throughput by group", "分组吞吐对比")}>
              <HorizontalBarChart data={throughput} height={220} formatValue={(value) => `${formatNumber(value)} t/s`} />
            </ChartPanel>
            <ChartPanel title={t("Group performance detail", "分组性能明细")}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-caption">
                  <thead>
                    <tr className="border-b border-ink/10 text-overline font-mono uppercase tracking-widest text-muted">
                      <th className="pb-3 pr-4">{t("Group", "分组")}</th>
                      <th className="pb-3 pr-4 text-right">{t("TTFT", "首 Token")}</th>
                      <th className="pb-3 pr-4 text-right">{t("Latency", "延迟")}</th>
                      <th className="pb-3 pr-4 text-right">{t("Success", "成功率")}</th>
                      <th className="pb-3 text-right">{t("TPS", "TPS")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {groups.map((item) => (
                      <tr key={item.group}>
                        <td className="py-3 pr-4 font-mono">{item.group}</td>
                        <td className="py-3 pr-4 text-right font-mono">{formatNumber(numberValue(item.avg_ttft_ms))} ms</td>
                        <td className="py-3 pr-4 text-right font-mono">{formatNumber(numberValue(item.avg_latency_ms))} ms</td>
                        <td className="py-3 pr-4 text-right font-mono">{formatNumber(numberValue(item.success_rate))}%</td>
                        <td className="py-3 text-right font-mono">{formatNumber(numberValue(item.avg_tps))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 flex items-center gap-2 text-micro text-muted"><BarChart3 className="h-3.5 w-3.5" />{totalRequests} {t("observed hourly buckets", "个小时观测桶")}</p>
            </ChartPanel>
          </div>
        </>
      )}
    </div>
  );
}
