import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Box, Search, BarChart3, Filter } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { PublicFooter } from "../../components/ui/PublicFooter";
import { api, type ApiPerfMetricSummary, type ApiPricing } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

export default function Pricing() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [models, setModels] = useState<ApiPricing[]>([]);
  const [performance, setPerformance] = useState<ApiPerfMetricSummary[]>([]);
  const [pricingMeta, setPricingMeta] = useState<{
    groups: Array<{ name: string; description: string }>;
    groupRatios: Record<string, number>;
    endpoints: string[];
    version: string;
  }>({ groups: [], groupRatios: {}, endpoints: [], version: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    void api.pricing()
      .then(async (payload) => {
        setModels(payload.models);
        setPricingMeta({
          groups: Object.entries(payload.usable_group ?? {}).map(([name, description]) => ({ name, description })),
          groupRatios: payload.group_ratio ?? {},
          endpoints: Object.keys(payload.supported_endpoint ?? {}),
          version: payload.pricing_version ?? "",
        });
        try {
          setPerformance(await api.perfMetricsSummary(24));
        } catch (cause) {
          console.warn("Pricing performance metrics unavailable", cause);
          setPerformance([]);
        }
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : t("Unable to load pricing.", "无法加载定价。"),
        ),
      )
      .finally(() => setIsLoading(false));
  }, [t]);
  const providers = useMemo(() => {
    const set = new Set<string>();
    models.forEach((m) => {
      if (m.owner_by) set.add(m.owner_by);
    });
    return Array.from(set).sort();
  }, [models]);
  const filtered = models.filter((model) => {
    if (provider && model.owner_by !== provider) return false;
    const lower = search.trim().toLowerCase();
    if (!lower) return true;
    return `${model.model_name} ${model.owner_by}`.toLowerCase().includes(lower);
  });
  const topExpensive = useMemo(() => {
    return [...filtered]
      .map((m) => ({ name: m.model_name, ratio: Number(m.model_ratio) || 0 }))
      .filter((m) => m.ratio > 0)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 8);
  }, [filtered]);
  const maxRatio = useMemo(
    () => Math.max(1, ...topExpensive.map((m) => m.ratio)),
    [topExpensive],
  );
  const performanceByModel = useMemo(
    () => new Map(performance.map((item) => [item.model_name, item])),
    [performance],
  );
  return (
    <div className="pt-24 pb-12 px-6 bg-primary min-h-screen">
      <div className="w-full max-w-6xl mx-auto mb-8">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-3 text-muted hover:text-[#121110] p-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="text-overline font-mono uppercase tracking-[0.2em]">
            {t("Back", "返回")}
          </span>
        </button>
      </div>
      <PageContainer
        title={t("Model Pricing", "模型定价")}
        subtitle={t(
          "Current prices published by the gateway.",
          "网关当前发布的模型价格。",
        )}
        isLoading={isLoading}
        error={error}
        onRetry={() => window.location.reload()}
      >
        <div className="border border-[#121110]/10 bg-white p-8 md:p-12">
          <div className="mb-8 flex flex-wrap gap-x-8 gap-y-2 border-b border-[#121110]/10 pb-5 text-micro text-muted">
            <span>
              {t("Available groups", "可用分组")}:{" "}
              <strong className="font-mono text-[#121110]">
                {pricingMeta.groups.length > 0
                  ? pricingMeta.groups.map((group) => `${group.name} · ${group.description || t("No description", "暂无介绍")} · ×${pricingMeta.groupRatios[group.name] ?? "-"}`).join("、")
                  : "-"}
              </strong>
            </span>
            <span>
              {t("Supported endpoints", "支持接口")}:{" "}
              <strong className="font-mono text-[#121110]">
                {pricingMeta.endpoints.join(", ") || "-"}
              </strong>
            </span>
            {pricingMeta.version && (
              <span>
                {t("Pricing version", "定价版本")}:{" "}
                <strong className="font-mono text-[#121110]">
                  {pricingMeta.version}
                </strong>
              </span>
            )}
          </div>
          {topExpensive.length > 0 && (
            <div className="mb-8">
              <p className="text-overline font-mono uppercase tracking-widest text-muted mb-3">
                {t("Top expensive models", "最贵模型")}
              </p>
              <div className="space-y-2">
                {topExpensive.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-micro font-mono w-32 truncate shrink-0">
                      {item.name}
                    </span>
                    <div className="flex-1 h-2 bg-inverse/8 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(4, (item.ratio / maxRatio) * 100)}%`,
                          backgroundColor: "var(--chart-1)",
                        }}
                      />
                    </div>
                    <span className="text-micro font-mono w-12 text-right shrink-0">
                      {item.ratio.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setProvider("")}
              className={`px-3 py-1.5 text-micro font-mono border transition-colors ${
                !provider
                  ? "border-[#121110] bg-inverse text-white"
                  : "border-[#121110]/30 text-[#121110]/60 hover:border-[#121110]"
              }`}
            >
              {t("All", "全部")}
            </button>
            {providers.map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`px-3 py-1.5 text-micro font-mono border transition-colors ${
                  provider === p
                    ? "border-[#121110] bg-inverse text-white"
                    : "border-[#121110]/30 text-[#121110]/60 hover:border-[#121110]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-sm mb-10">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                "Search models or providers...",
                "搜索模型或供应商...",
              )}
              className="w-full bg-transparent border-b border-[#121110]/20 py-3 pl-11 pr-4 text-label outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead>
                <tr className="border-b-2 border-[#121110] text-overline font-mono uppercase tracking-widest text-muted">
                  <th className="pb-4 pl-4">{t("Model", "模型")}</th>
                  <th className="pb-4">{t("Provider", "供应商")}</th>
                  <th className="pb-4 text-right">
                    {t("Model Ratio", "模型倍率")}
                  </th>
                  <th className="pb-4 text-right">
                    {t("Completion Ratio", "补全倍率")}
                  </th>
                  <th className="pb-4 text-right">
                    {t("Cache Ratio", "缓存倍率")}
                  </th>
                  <th className="pb-4 text-right">
                    {t("Fixed Price", "固定价格")}
                  </th>
                  <th className="pb-4 text-right">{t("Success", "成功率")}</th>
                  <th className="pb-4 text-right">{t("Latency", "延迟")}</th>
                  <th className="pb-4 pr-4">{t("Billing", "计费")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#121110]/10">
                {filtered.map((model) => (
                  <tr key={model.model_name}>
                    <td className="py-5 pl-4">
                      <span className="flex items-center gap-3 font-serif text-lg">
                        <Box className="w-4 h-4" />
                        {model.model_name}
                      </span>
                    </td>
                    <td className="py-5 text-label text-muted">
                      {model.owner_by || "-"}
                    </td>
                    <td className="py-5 text-right font-mono text-[12px]">
                      {model.model_ratio}
                    </td>
                    <td className="py-5 text-right font-mono text-[12px]">
                      {model.completion_ratio}
                    </td>
                    <td className="py-5 text-right font-mono text-[12px]">
                      {model.cache_ratio ?? "-"}
                    </td>
                    <td className="py-5 text-right font-mono text-[12px]">
                      {model.model_price || "-"}
                    </td>
                    <td className="py-5 text-right font-mono text-[12px]">
                      {(() => {
                        const item = performanceByModel.get(model.model_name);
                        if (!item || item.request_count <= 0) return "-";
                        return `${((item.success_count / item.request_count) * 100).toFixed(1)}%`;
                      })()}
                    </td>
                    <td className="py-5 text-right font-mono text-[12px]">
                      {(() => {
                        const item = performanceByModel.get(model.model_name);
                        if (!item || item.request_count <= 0) return "-";
                        return `${(item.total_latency_ms / item.request_count).toFixed(0)} ms`;
                      })()}
                    </td>
                    <td className="py-5 pr-4 text-[12px] text-muted">
                      {model.billing_mode || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-16 text-center text-overline font-mono uppercase tracking-widest text-muted">
                {t("No pricing data available.", "暂无定价数据。")}
              </p>
            )}
          </div>
        </div>
      </PageContainer>
      <PublicFooter />
    </div>
  );
}
