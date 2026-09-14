import { useCallback, useEffect, useState } from "react";
import { Trophy, BarChart3 } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { api, type ApiRankingSnapshot } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { SelectMenu } from "../../components/ui/SelectMenu";

type Ranking = {
  rank: number;
  model_name: string;
  vendor: string;
  total_tokens: number;
  share: number;
  growth_pct: number;
  previous_rank?: number;
};
type Period = "today" | "week" | "month" | "year";
type UserPeriod = Period | "all";
type UserRow = {
  rank: number;
  username: string;
  quota: number;
  requests: number;
};

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: unknown) {
  const parsed = finiteNumber(value);
  return parsed == null ? "—" : parsed.toLocaleString();
}

function formatPercent(value: unknown) {
  const parsed = finiteNumber(value);
  return parsed == null ? "—" : `${(parsed * 100).toFixed(1)}%`;
}

function formatGrowth(value: unknown) {
  const parsed = finiteNumber(value);
  if (parsed == null) return "—";
  return `${parsed >= 0 ? "+" : ""}${parsed.toFixed(1)}%`;
}

export default function Rankings() {
  const { t } = useLang();
  const [period, setPeriod] = useState<Period>("week");
  const [userPeriod, setUserPeriod] = useState<UserPeriod>("week");
  const [userLimit, setUserLimit] = useState<10 | 20 | 50>(20);
  const [rows, setRows] = useState<Ranking[]>([]);
  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [snapshot, setSnapshot] = useState<ApiRankingSnapshot>({});
  const [view, setView] = useState<"models" | "vendors" | "users">("models");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRankings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === "users")
        setUserRows(await api.userRanking(userPeriod, userLimit));
      else {
        const next = await api.rankings(period);
        setSnapshot(next);
        setRows((next.models ?? []) as Ranking[]);
      }
    } catch (cause) {
      setRows([]);
      setError(
        cause instanceof Error
          ? cause.message
          : t("Unable to load rankings.", "无法加载排行榜。"),
      );
    } finally {
      setLoading(false);
    }
  }, [period, t, userLimit, userPeriod, view]);

  useEffect(() => {
    void loadRankings();
  }, [loadRankings]);

  return (
    <PageContainer
      title={t("Rankings", "排行榜")}
      subtitle={t(
        "Usage rankings reported by the gateway.",
        "网关统计的用量排行榜。",
      )}
      isLoading={loading}
      error={error}
      onRetry={loadRankings}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setView("models")}
          className={`border px-4 py-2 text-overline font-mono uppercase tracking-widest ${view === "models" ? "border-[#121110] bg-inverse text-white" : "border-[#121110]/15 bg-white text-muted"}`}
        >
          {t("Models", "模型")}
        </button>
        <button
          onClick={() => setView("vendors")}
          className={`border px-4 py-2 text-overline font-mono uppercase tracking-widest ${view === "vendors" ? "border-[#121110] bg-inverse text-white" : "border-[#121110]/15 bg-white text-muted"}`}
        >
          {t("Vendors", "供应商")}
        </button>
        <button
          onClick={() => setView("users")}
          className={`border px-4 py-2 text-overline font-mono uppercase tracking-widest ${view === "users" ? "border-[#121110] bg-inverse text-white" : "border-[#121110]/15 bg-white text-muted"}`}
        >
          {t("Users", "用户")}
        </button>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {(view === "users"
          ? (["today", "week", "month", "year", "all"] as UserPeriod[])
          : (["today", "week", "month", "year"] as Period[])
        ).map((item) => (
          <button
            key={item}
            onClick={() =>
              view === "users"
                ? setUserPeriod(item as UserPeriod)
                : setPeriod(item as Period)
            }
            className={`border px-4 py-2 text-overline font-mono uppercase tracking-widest ${(view === "users" ? userPeriod : period) === item ? "border-[#121110] bg-inverse text-white" : "border-[#121110]/15 bg-white text-muted"}`}
          >
            {t(
              item,
              item === "today"
                ? "今日"
                : item === "week"
                  ? "本周"
                  : item === "month"
                    ? "本月"
                    : item === "year"
                      ? "年度"
                      : "全部",
            )}
          </button>
        ))}
        {view === "users" && (
          <SelectMenu value={String(userLimit)} onChange={(value) => setUserLimit(Number(value) as 10 | 20 | 50)} ariaLabel={t("User ranking size", "用户榜单数量")} options={["10", "20", "50"].map((value) => ({ value, label: value }))} />
        )}
      </div>
      {view === "models" &&
        ((snapshot.top_movers?.length ?? 0) > 0 ||
          (snapshot.top_droppers?.length ?? 0) > 0) && (
          <div className="mb-6 grid gap-px border border-[#121110]/10 bg-inverse/10 md:grid-cols-2">
            {[
              [
                t("Top movers", "上升最快"),
                snapshot.top_movers ?? [],
                "text-green-700",
              ],
              [
                t("Top droppers", "下降最快"),
                snapshot.top_droppers ?? [],
                "text-red-700",
              ],
            ].map(([title, items, color]) => (
              <div key={String(title)} className="bg-white p-5">
                <h3
                  className={`mb-3 text-overline font-mono uppercase tracking-widest ${String(color)}`}
                >
                  {String(title)}
                </h3>
                <div className="space-y-2 text-[12px]">
                  {(items as ApiRankingSnapshot["top_movers"])
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        key={item.model_name}
                        className="flex justify-between gap-3"
                      >
                        <span className="truncate">{item.model_name}</span>
                        <span className="shrink-0 font-mono">
                          {item.rank_delta > 0 ? "+" : ""}
                          {item.rank_delta}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      {view === "models" && (snapshot.models?.length ?? 0) > 0 && (
        <div className="mb-6 overflow-hidden rounded-sm border border-[#121110]/10 bg-white">
          <div className="flex items-center gap-2 border-b border-[#121110]/10 px-5 py-3">
            <BarChart3 className="h-3.5 w-3.5 text-muted" strokeWidth={1.5} />
            <span className="text-overline font-mono uppercase tracking-widest text-muted">
              {t("Market share", "市场份额")}
            </span>
          </div>
          <div className="px-5 py-4 space-y-2.5">
            {(snapshot.models ?? []).slice(0, 8).map((m) => {
              const pct = (m.share * 100).toFixed(1);
              return (
                <div key={m.model_name} className="grid grid-cols-[1fr,52px,52px] items-center gap-3 text-[12px]">
                  <span className="truncate font-medium">{m.model_name}</span>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-inverse/8">
                    <div
                      className="h-full rounded-full bg-inverse"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-right font-mono text-muted">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {view === "users" ? (
        userRows.length === 0 ? (
          <div className="border border-dashed border-[#121110]/20 bg-white p-16 text-center text-label text-muted">
            <Trophy className="mx-auto mb-4 h-8 w-8" strokeWidth={1.5} />
            {t(
              "No user ranking data is available for this period.",
              "该时间段暂无用户排行榜数据。",
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#121110]/10 bg-white">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-[#121110]/10 text-overline font-mono uppercase tracking-widest text-muted">
                  <th className="px-6 py-4">{t("Rank", "排名")}</th>
                  <th className="px-6 py-4">{t("User", "用户")}</th>
                  <th className="px-6 py-4 text-right">{t("Quota", "额度")}</th>
                  <th className="px-6 py-4 text-right">
                    {t("Requests", "请求数")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#121110]/5">
                {userRows.map((row) => (
                  <tr key={`${row.rank}-${row.username}`}>
                    <td className="px-6 py-4 font-mono">#{row.rank}</td>
                    <td className="px-6 py-4">{row.username}</td>
                    <td className="px-6 py-4 text-right font-mono">
                      {formatNumber(row.quota)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {formatNumber(row.requests)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : view === "vendors" ? (
        (snapshot.vendors ?? []).length === 0 ? (
          <div className="border border-dashed border-[#121110]/20 bg-white p-16 text-center text-label text-muted">
            <Trophy className="mx-auto mb-4 h-8 w-8" strokeWidth={1.5} />
            {t(
              "No vendor ranking data is available for this period.",
              "该时间段暂无供应商排行榜数据。",
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#121110]/10 bg-white">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-[#121110]/10 text-overline font-mono uppercase tracking-widest text-muted">
                  <th className="px-6 py-4">{t("Rank", "排名")}</th>
                  <th className="px-6 py-4">{t("Vendor", "供应商")}</th>
                  <th className="px-6 py-4 text-right">
                    {t("Models", "模型数")}
                  </th>
                  <th className="px-6 py-4">{t("Top model", "代表模型")}</th>
                  <th className="px-6 py-4 text-right">{t("Share", "占比")}</th>
                  <th className="px-6 py-4 text-right">
                    {t("Growth", "增长")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#121110]/5">
                {snapshot.vendors.map((vendor) => (
                  <tr key={vendor.vendor}>
                    <td className="px-6 py-4 font-mono">#{vendor.rank}</td>
                    <td className="px-6 py-4">{vendor.vendor || "-"}</td>
                    <td className="px-6 py-4 text-right font-mono">
                      {vendor.models_count}
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {vendor.top_model || "-"}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {formatPercent(vendor.share)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-mono ${vendor.growth_pct >= 0 ? "text-green-700" : "text-red-700"}`}
                    >
                      {formatGrowth(vendor.growth_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : rows.length === 0 ? (
        <div className="border border-dashed border-[#121110]/20 bg-white p-16 text-center text-label text-muted">
          <Trophy className="mx-auto mb-4 h-8 w-8" strokeWidth={1.5} />
          {t(
            "No ranking data is available for this period.",
            "该时间段暂无排行榜数据。",
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#121110]/10 bg-white">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-[#121110]/10 text-overline font-mono uppercase tracking-widest text-muted">
                <th className="px-6 py-4">{t("Rank", "排名")}</th>
                <th className="px-6 py-4">{t("Model", "模型")}</th>
                <th className="px-6 py-4">{t("Provider", "供应商")}</th>
                <th className="px-6 py-4 text-right">
                  {t("Tokens", "令牌数")}
                </th>
                <th className="px-6 py-4 text-right">{t("Share", "占比")}</th>
                <th className="px-6 py-4 text-right">{t("Growth", "增长")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#121110]/5">
              {rows.map((row) => (
                <tr key={`${row.rank}-${row.model_name}`}>
                  <td className="px-6 py-4 font-mono">#{row.rank}</td>
                  <td className="px-6 py-4">{row.model_name}</td>
                  <td className="px-6 py-4 text-muted">{row.vendor || "-"}</td>
                  <td className="px-6 py-4 text-right font-mono">
                    {formatNumber(row.total_tokens)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {formatPercent(row.share)}
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-mono ${row.growth_pct >= 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    {formatGrowth(row.growth_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
