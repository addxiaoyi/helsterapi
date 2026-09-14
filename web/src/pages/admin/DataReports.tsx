import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Download, RefreshCw } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type Report = "quota" | "users" | "flow";
type Range = "7d" | "30d" | "90d";
const RANGE_SECONDS: Record<Range, number> = {
  "7d": 7 * 86400,
  "30d": 30 * 86400,
  "90d": 90 * 86400,
};

function rangeToLabel(r: Range) {
  return r === "7d" ? "7天" : r === "30d" ? "30天" : "90天";
}

type QuotaRow = { date: string; quota: number };
type UserRow = { username: string; quota: number; requests: number };
type FlowRow = {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total: number;
};

function readNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function readDate(value: unknown) {
  return typeof value === "string" && value ? value : "-";
}

function normalizeQuotaRows(items: unknown): QuotaRow[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({ date: readDate(item.date), quota: readNumber(item.quota) }));
}

function normalizeUserRows(items: unknown): UserRow[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      username: typeof item.username === "string" ? item.username : "-",
      quota: readNumber(item.quota),
      requests: readNumber(item.requests),
    }));
}

function normalizeFlowRows(items: unknown): FlowRow[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      date: readDate(item.date),
      input_tokens: readNumber(item.input_tokens),
      output_tokens: readNumber(item.output_tokens),
      total: readNumber(item.total),
    }));
}

function MiniBarChart({
  data,
  height = 120,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
          <div
            className="w-full bg-inverse transition-all"
            style={{
              height: `${Math.max((d.value / max) * height * 0.9, d.value > 0 ? 4 : 0)}px`,
            }}
            title={`${d.label}: ${d.value.toLocaleString()}`}
          />
          <span className="text-caption text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryCards({ items, report }: { items: unknown[]; report: Report }) {
  if (report === "quota") {
    const rows = normalizeQuotaRows(items);
    const total = rows.reduce((s, r) => s + r.quota, 0);
    const avg = rows.length ? Math.round(total / rows.length) : 0;
    const peak = rows.length ? Math.max(...rows.map((r) => r.quota)) : 0;
    return (
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded border border-[#121110]/10 p-3">
          <div className="text-caption text-muted">总消耗</div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {total.toLocaleString()}
          </div>
        </div>
        <div className="rounded border border-[#121110]/10 p-3">
          <div className="text-caption text-muted">日均</div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {avg.toLocaleString()}
          </div>
        </div>
        <div className="rounded border border-[#121110]/10 p-3">
          <div className="text-caption text-muted">峰值</div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {peak.toLocaleString()}
          </div>
        </div>
      </div>
    );
  }
  if (report === "users") {
    const rows = normalizeUserRows(items);
    const totalQuota = rows.reduce((s, r) => s + r.quota, 0);
    const totalReq = rows.reduce((s, r) => s + r.requests, 0);
    const avgQuota = rows.length ? Math.round(totalQuota / rows.length) : 0;
    return (
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded border border-[#121110]/10 p-3">
          <div className="text-caption text-muted">用户数</div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {rows.length}
          </div>
        </div>
        <div className="rounded border border-[#121110]/10 p-3">
          <div className="text-caption text-muted">总消耗</div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {totalQuota.toLocaleString()}
          </div>
        </div>
        <div className="rounded border border-[#121110]/10 p-3">
          <div className="text-caption text-muted">总请求</div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {totalReq.toLocaleString()}
          </div>
        </div>
      </div>
    );
  }
  // flow
  const rows = normalizeFlowRows(items);
  const totalIn = rows.reduce((s, r) => s + r.input_tokens, 0);
  const totalOut = rows.reduce((s, r) => s + r.output_tokens, 0);
  return (
    <div className="mb-4 grid grid-cols-3 gap-3">
      <div className="rounded border border-[#121110]/10 p-3">
        <div className="text-caption text-muted">输入 Token</div>
        <div className="mt-1 font-mono text-lg font-semibold">
          {totalIn.toLocaleString()}
        </div>
      </div>
      <div className="rounded border border-[#121110]/10 p-3">
        <div className="text-caption text-muted">输出 Token</div>
        <div className="mt-1 font-mono text-lg font-semibold">
          {totalOut.toLocaleString()}
        </div>
      </div>
      <div className="rounded border border-[#121110]/10 p-3">
        <div className="text-caption text-muted">总请求</div>
        <div className="mt-1 font-mono text-lg font-semibold">
          {rows.length}
        </div>
      </div>
    </div>
  );
}

function exportCSV(items: unknown[], report: Report) {
  let csv = "";
  if (report === "quota") {
    csv =
      "日期,额度\n" +
      (items as QuotaRow[]).map((r) => `${r.date},${r.quota}`).join("\n");
  } else if (report === "users") {
    csv =
      "用户名,额度,请求数\n" +
      (items as UserRow[])
        .map((r) => `${r.username},${r.quota},${r.requests}`)
        .join("\n");
  } else {
    csv =
      "日期,输入Token,输出Token,总计\n" +
      (items as FlowRow[])
        .map((r) => `${r.date},${r.input_tokens},${r.output_tokens},${r.total}`)
        .join("\n");
  }
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report_${report}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataReports() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [report, setReport] = useState<Report>("quota");
  const [range, setRange] = useState<Range>("30d");
  const [username, setUsername] = useState("");
  const [payload, setPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataExportEnabled, setDataExportEnabled] = useState(true);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const rid = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    const end = Math.floor(Date.now() / 1000);
    const start = end - RANGE_SECONDS[range];
    try {
      const status = await api.status();
      const enabled = status.enable_data_export !== false;
      if (rid !== requestIdRef.current) return; // race guard
      setDataExportEnabled(enabled);
      if (!enabled) {
        setPayload(null);
        return;
      }
      let data: unknown;
      if (report === "quota") {
        data = await api.quotaDates(start, end, username.trim() || undefined);
      } else if (report === "users") {
        data = await api.quotaDatesByUser(start, end);
      } else {
        data = await api.flowQuotaDates(
          start,
          end,
          username.trim() || undefined,
        );
      }
      if (rid !== requestIdRef.current) return; // race guard
      setPayload(data);
    } catch (cause) {
      if (rid !== requestIdRef.current) return;
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load data report.", "无法加载数据报表。");
      setError(message);
      toast.error({ message });
    } finally {
      if (rid === requestIdRef.current) setLoading(false);
    }
  }, [report, range, username, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => {
    if (!payload || typeof payload !== "object" || payload === null)
      return null;
    if (report === "quota") {
      return (
        normalizeQuotaRows((payload as { dates?: unknown }).dates).map((r) => ({
          label: r.date.slice(5),
          value: r.quota,
        }))
      );
    }
    if (report === "flow") {
      return (
        normalizeFlowRows((payload as { dates?: unknown }).dates).map((r) => ({
          label: r.date.slice(5),
          value: r.total,
        }))
      );
    }
    return null;
  }, [payload, report]);

  const tableItems = useMemo(() => {
    if (!payload || typeof payload !== "object" || payload === null) return [];
    if (report === "quota")
      return normalizeQuotaRows((payload as { dates?: unknown }).dates);
    if (report === "users")
      return normalizeUserRows((payload as { users?: unknown }).users);
    return normalizeFlowRows((payload as { dates?: unknown }).dates);
  }, [payload, report]);

  const tabs: Array<[Report, string, string]> = [
    ["quota", "Quota", "额度"],
    ["users", "By user", "按用户"],
    ["flow", "Traffic", "流量"],
  ];
  const ranges: Range[] = ["7d", "30d", "90d"];

  return (
    <PageContainer
      title={t("Data Reports", "数据报表")}
      subtitle={t(
        "Inspect quota and traffic data from the active server.",
        "查看当前服务端的额度与流量数据。",
      )}
      isLoading={loading}
      error={error}
      onRetry={load}
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
          {tableItems.length > 0 && (
            <button
              type="button"
              onClick={() => exportCSV(tableItems, report)}
              className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
            >
              <Download className="h-3.5 w-3.5" />
              {t("Export CSV", "导出 CSV")}
            </button>
          )}
        </>
      }
    >
      {!dataExportEnabled && !loading && (
        <div className="border border-amber-600/30 bg-amber-50 p-5 text-[12px] text-amber-800">
          {t(
            "Data export is disabled by the server administrator.",
            "服务端管理员已关闭数据导出与报表功能。",
          )}
        </div>
      )}
      {dataExportEnabled && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {tabs.map(([id, en, zh]) => (
              <button
                type="button"
                key={id}
                onClick={() => setReport(id)}
                className={`border px-4 py-2 text-overline font-mono uppercase ${
                  report === id
                    ? "border-[#121110] bg-inverse text-white"
                    : "border-[#121110]/20"
                }`}
              >
                <BarChart3 className="mr-1.5 inline h-3.5 w-3.5" />
                {t(en, zh)}
              </button>
            ))}

            <span className="mx-1 h-4 w-px bg-inverse/10" />

            {ranges.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRange(r)}
                className={`border px-3 py-2 text-overline font-mono ${
                  range === r
                    ? "border-[#121110] bg-inverse text-white"
                    : "border-[#121110]/20"
                }`}
              >
                {rangeToLabel(r)}
              </button>
            ))}

            {report !== "users" && (
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("Username (optional)", "用户名（可选）")}
                className="border-b border-[#121110]/20 bg-transparent px-3 py-2 text-caption outline-none"
              />
            )}
          </div>
        </>
      )}

      {dataExportEnabled && (
        <div className="border border-[#121110]/10 bg-white p-5">
          {tableItems.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-muted">
              {t("No data returned.", "暂无数据。")}
            </p>
          ) : (
            <>
              <SummaryCards items={tableItems} report={report} />

              {chartData && chartData.length > 0 && (
                <div className="mb-6">
                  <MiniBarChart data={chartData} />
                </div>
              )}

              <div className="max-h-96 overflow-auto">
                <table className="w-full border-collapse text-caption">
                  <thead>
                    <tr className="border-b border-[#121110]/10">
                      {report === "quota" && (
                        <>
                          <th className="py-2 text-left font-medium text-muted">
                            日期
                          </th>
                          <th className="py-2 text-right font-medium text-muted">
                            额度
                          </th>
                        </>
                      )}
                      {report === "users" && (
                        <>
                          <th className="py-2 text-left font-medium text-muted">
                            用户名
                          </th>
                          <th className="py-2 text-right font-medium text-muted">
                            额度
                          </th>
                          <th className="py-2 text-right font-medium text-muted">
                            请求数
                          </th>
                        </>
                      )}
                      {report === "flow" && (
                        <>
                          <th className="py-2 text-left font-medium text-muted">
                            日期
                          </th>
                          <th className="py-2 text-right font-medium text-muted">
                            输入 Token
                          </th>
                          <th className="py-2 text-right font-medium text-muted">
                            输出 Token
                          </th>
                          <th className="py-2 text-right font-medium text-muted">
                            总计
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {report === "quota" &&
                      (tableItems as QuotaRow[]).map((r, i) => (
                        <tr key={i} className="border-b border-[#121110]/5">
                          <td className="py-1.5 font-mono">{r.date}</td>
                          <td className="py-1.5 text-right font-mono">
                            {r.quota.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    {report === "users" &&
                      (tableItems as UserRow[])
                        .sort((a, b) => b.quota - a.quota)
                        .map((r, i) => (
                          <tr key={i} className="border-b border-[#121110]/5">
                            <td className="py-1.5 font-mono">{r.username}</td>
                            <td className="py-1.5 text-right font-mono">
                              {r.quota.toLocaleString()}
                            </td>
                            <td className="py-1.5 text-right font-mono">
                              {r.requests.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    {report === "flow" &&
                      (tableItems as FlowRow[]).map((r, i) => (
                        <tr key={i} className="border-b border-[#121110]/5">
                          <td className="py-1.5 font-mono">{r.date}</td>
                          <td className="py-1.5 text-right font-mono">
                            {r.input_tokens.toLocaleString()}
                          </td>
                          <td className="py-1.5 text-right font-mono">
                            {r.output_tokens.toLocaleString()}
                          </td>
                          <td className="py-1.5 text-right font-mono">
                            {r.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </PageContainer>
  );
}
