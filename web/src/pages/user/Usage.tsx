import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { useToast } from "../../components/ui/Toast";
import { api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

type Range = "7d" | "30d" | "90d";
const RANGE_SECONDS: Record<Range, number> = {
  "7d": 7 * 86400,
  "30d": 30 * 86400,
  "90d": 90 * 86400,
};

function rangeLabel(r: Range) {
  return r === "7d" ? "7天" : r === "30d" ? "30天" : "90天";
}

type RawUsageRow = {
  created_at: number;
  quota: number;
  token_used: number;
  count: number;
};
type UsageRow = {
  date: string;
  quota: number;
  token_used: number;
  count: number;
};
type LogStats = { quota: number; rpm: number; tpm: number };
type ErrorStats = { requests: number; errors: number; error_rate: number };

/* ── helpers ── */
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function readNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function usageDate(timestamp: unknown) {
  const raw = readNumber(timestamp);
  if (raw <= 0) return "未知日期";
  const value = raw > 1e12 ? raw : raw * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知日期" : date.toISOString().slice(0, 10);
}

function aggregateUsage(rows: RawUsageRow[]): UsageRow[] {
  const byDate = new Map<string, UsageRow>();
  for (const row of rows) {
    const date = usageDate(row.created_at);
    const current = byDate.get(date) ?? {
      date,
      quota: 0,
      token_used: 0,
      count: 0,
    };
    current.quota += readNumber(row.quota);
    current.token_used += readNumber(row.token_used);
    current.count += readNumber(row.count);
    byDate.set(date, current);
  }
  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/* ── mini chart ── */
function MiniBarChart({
  data,
  height = 80,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-px" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
          <div
            className="w-full bg-inverse transition-all"
            style={{
              height: `${Math.max((d.value / max) * height * 0.9, d.value > 0 ? 4 : 0)}px`,
            }}
            title={`${d.label}: ${d.value.toLocaleString()}`}
          />
          <span className="text-[8px] text-muted leading-none">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── stat card ── */
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="border border-[#121110]/10 bg-white p-6">
      <div className="text-overline font-mono uppercase tracking-widest text-muted mb-3">
        {label}
      </div>
      <div className="text-2xl font-mono font-semibold text-[#121110]">
        {typeof value === "number" ? fmtNum(value) : value}
      </div>
      {sub && (
        <div className="mt-1 text-overline font-mono text-muted">{sub}</div>
      )}
    </div>
  );
}

/* ── recharts custom tooltip ── */
function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  labelFormatter?: (v: string) => string;
  valueFormatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-[#121110]/10 bg-white px-3 py-2 shadow-sm">
      <p className="mb-1.5 text-overline font-mono text-muted">
        {labelFormatter ? labelFormatter(label!) : label}
      </p>
      {payload.map((p) => (
        <p key={p.name} className="text-micro font-mono text-[#121110]">
          <span
            className="inline-block w-2 h-2 mr-1.5 rounded-sm"
            style={{ background: p.color }}
          />
          {p.name}:{" "}
          {valueFormatter ? valueFormatter(p.value) : p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function EmptyTrendChart({ type, label }: { type: "quota" | "flow"; label: string }) {
  const data = Array.from({ length: 7 }, (_, index) => ({ label: `${index + 1}`, value: 0 }));
  return (
    <div className="relative h-[280px]" aria-label={label}>
      <div className="pointer-events-none absolute inset-x-8 bottom-10 top-4 border-b border-l border-[#121110]/15">
        {["25%", "50%", "75%"].map((top) => (
          <span key={top} className="absolute inset-x-0 border-t border-dashed border-[#121110]/10" style={{ top }} />
        ))}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        {type === "quota" ? (
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#7A7772", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 9, fill: "#7A7772", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
            <Bar dataKey="value" fill="#121110" opacity={0.18} maxBarSize={28} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#7A7772", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 9, fill: "#7A7772", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
            <Line type="monotone" dataKey="value" stroke="#121110" strokeOpacity={0.25} strokeWidth={1.5} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
      <p className="absolute inset-x-0 bottom-1 text-center text-caption text-muted">{label}</p>
    </div>
  );
}

/* ── main component ── */
export default function Usage() {
  const { t } = useLang();
  const toast = useToast();
  const [range, setRange] = useState<Range>("30d");
  const [quotaData, setQuotaData] = useState<UsageRow[]>([]);
  const [flowData, setFlowData] = useState<UsageRow[]>([]);
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const end = Math.floor(Date.now() / 1000);
    const start = end - RANGE_SECONDS[range];
    try {
      const [qd, fd, ls, es] = await Promise.all([
        api.userQuotaDates(start, end),
        api.userFlowQuotaDates(start, end),
        api.userLogStats() as Promise<LogStats>,
        api.userLogErrorStats(start, end),
      ]);
      setQuotaData(aggregateUsage(qd ?? []));
      setFlowData(aggregateUsage(fd ?? []));
      setLogStats(ls ?? null);
      setErrorStats(es ?? null);
    } catch (cause) {
      const msg =
        cause instanceof Error
          ? cause.message
          : t("Unable to load usage data.", "无法加载用量数据。");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [range, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── chart data ── */
  const quotaChartData = useMemo(() => {
    return quotaData.map((r) => ({
      label: r.date.slice(5),
      full: r.date,
      value: r.quota,
    }));
  }, [quotaData]);

  const flowChartData = useMemo(() => {
    return flowData.map((r) => ({
      label: r.date.slice(5),
      full: r.date,
      total: r.token_used,
    }));
  }, [flowData]);

  /* ── table rows ── */
  const quotaRows = quotaData;
  const flowRows = flowData;

  const ranges: Range[] = ["7d", "30d", "90d"];

  return (
    <PageContainer
      title={t("Usage Analysis", "用量分析")}
      subtitle={t(
        "Your quota and traffic activity over time.",
        "查看您的额度与流量活动趋势。",
      )}
      isLoading={loading}
      error={error}
      onRetry={load}
      actions={
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase tracking-widest hover:border-[#121110] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("Refresh", "刷新")}
        </button>
      }
    >
      {/* ── time range selector ── */}
      <div className="mb-4 flex items-center gap-2">
        <span className="mr-2 text-overline font-mono uppercase tracking-widest text-muted">
          {t("Period", "周期")}:
        </span>
        {ranges.map((r) => (
          <button
            type="button"
            key={r}
            onClick={() => setRange(r)}
            className={`border px-4 py-1.5 text-overline font-mono uppercase tracking-wider transition-colors ${
              range === r
                ? "border-[#121110] bg-inverse text-white"
                : "border-[#121110]/20 text-[#121110]/60 hover:border-[#121110]/40"
            }`}
          >
            {rangeLabel(r)}
          </button>
        ))}
      </div>

      {/* ── stat summary cards ── */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("Total Quota Used", "总消耗额度")}
          value={logStats ? readNumber(logStats.quota) : "—"}
          sub={t("All time", "累计")}
        />
        <StatCard
          label={t("Avg RPM", "平均 RPM")}
          value={logStats ? readNumber(logStats.rpm) : "—"}
          sub={t("Requests per minute", "每分钟请求数")}
        />
        <StatCard
          label={t("Avg TPM", "平均 TPM")}
          value={logStats ? readNumber(logStats.tpm) : "—"}
          sub={t("Tokens per minute", "每分钟 Token 数")}
        />
        <StatCard
          label={t("Error Rate", "错误率")}
          value={errorStats ? `${(readNumber(errorStats.error_rate) * 100).toFixed(1)}%` : "—"}
          sub={errorStats ? `${readNumber(errorStats.errors)} / ${readNumber(errorStats.requests + errorStats.errors)} ${t("requests", "请求")}` : t("Unavailable", "暂无数据")}
        />
      </div>

      {/* ── charts row ── */}
      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Daily quota bar chart */}
        <div className="border border-[#121110]/10 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-micro font-mono uppercase tracking-widest text-[#121110]">
              {t("Daily Quota", "每日额度")}
            </h3>
            {quotaChartData.length > 0 && (
              <span className="text-overline font-mono text-muted">
                {quotaChartData.length} {t("days", "天")}
              </span>
            )}
          </div>

          {quotaChartData.length === 0 ? (
            <EmptyTrendChart type="quota" label={t("No quota data yet", "暂无额度数据")} />
          ) : (
            <>
              {/* mini sparkline above */}
              <div className="mb-4">
                <MiniBarChart data={quotaChartData} height={60} />
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={quotaChartData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#121110/5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 9,
                      fill: "#7A7772",
                      fontFamily: "monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{
                      fontSize: 9,
                      fill: "#7A7772",
                      fontFamily: "monospace",
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => fmtNum(v)}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        labelFormatter={(v) =>
                          quotaChartData.find((d) => d.label === v)?.full ?? v
                        }
                        valueFormatter={(v) => v.toLocaleString()}
                      />
                    }
                  />
                  <Bar
                    dataKey="quota"
                    name={t("Quota", "额度")}
                    fill="#121110"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Daily token flow line chart */}
        <div className="border border-[#121110]/10 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-micro font-mono uppercase tracking-widest text-[#121110]">
              {t("Token Flow", "Token 流量")}
            </h3>
            {flowChartData.length > 0 && (
              <span className="text-overline font-mono text-muted">
                {flowChartData.length} {t("days", "天")}
              </span>
            )}
          </div>

          {flowChartData.length === 0 ? (
            <EmptyTrendChart type="flow" label={t("No flow data yet", "暂无流量数据")} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={flowChartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#121110/5"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 9,
                    fill: "#7A7772",
                    fontFamily: "monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{
                    fontSize: 9,
                    fill: "#7A7772",
                    fontFamily: "monospace",
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtNum(v)}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      labelFormatter={(v) =>
                        flowChartData.find((d) => d.label === v)?.full ?? v
                      }
                      valueFormatter={(v) => v.toLocaleString()}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name={t("Tokens", "Token")}
                  stroke="#121110"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── daily breakdown table ── */}
      <div className="border border-[#121110]/10 bg-white">
        <div className="border-b border-[#121110]/10 px-6 py-4">
          <h3 className="text-micro font-mono uppercase tracking-widest text-[#121110]">
            {t("Daily Breakdown", "每日明细")}
          </h3>
        </div>

        {quotaRows.length === 0 && flowRows.length === 0 ? (
          <div className="p-6"><EmptyTrendChart type="flow" label={t("No daily data yet", "暂无每日数据")} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-caption">
              <thead>
                <tr className="border-b border-[#121110]/10 bg-subtle">
                  <th className="px-6 py-2.5 text-left font-mono text-caption uppercase tracking-widest text-muted">
                    {t("Date", "日期")}
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-caption uppercase tracking-widest text-muted">
                    {t("Quota", "额度")}
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-caption uppercase tracking-widest text-muted">
                    {t("Requests", "请求数")}
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-caption uppercase tracking-widest text-muted">
                    {t("Tokens", "Token")}
                  </th>
                  <th className="px-4 py-2.5 text-right font-mono text-caption uppercase tracking-widest text-muted">
                    {t("Flow Quota", "流量额度")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* merge quota + flow rows by date */}
                {(() => {
                  const allDates = [
                    ...new Set([
                      ...quotaRows.map((r) => r.date),
                      ...flowRows.map((r) => r.date),
                    ]),
                  ].sort();

                  return allDates.map((date) => {
                    const qr = quotaRows.find((r) => r.date === date);
                    const fr = flowRows.find((r) => r.date === date);
                    return (
                      <tr
                        key={date}
                        className="border-b border-[#121110]/5 hover:bg-subtle/60 transition-colors"
                      >
                        <td className="px-6 py-2.5 font-mono text-[#121110]">
                          {date}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[#121110]">
                          {qr ? qr.quota.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[#121110]">
                          {fr ? fr.count.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[#121110]">
                          {fr ? fr.token_used.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[#121110]">
                          {fr ? fr.quota.toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
