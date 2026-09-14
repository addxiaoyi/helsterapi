import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { MultiSelectMenu } from "../../components/ui/MultiSelectMenu";
import { displayChannelName } from "../../lib/channelDisplay";

type RatioConfig = {
  model_ratio?: Record<string, number>;
  completion_ratio?: Record<string, number>;
  model_price?: Record<string, number>;
  cache_ratio?: Record<string, number>;
  [key: string]: unknown;
};

type Row = {
  name: string;
  model_ratio: number | string;
  completion_ratio: number | string;
  cache_ratio: number | string;
  model_price: number | string;
};

const RATIO_KEYS: Array<keyof RatioConfig> = [
  "model_ratio",
  "completion_ratio",
  "cache_ratio",
  "model_price",
];

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatNumber(value: number | string): string {
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "-";
  if (value === 0) return "0";
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(4).replace(/\.?0+$/, "");
}

function readMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      result[key] = raw;
    }
  }
  return result;
}

type SyncableChannel = {
  id: number;
  name: string;
  type?: number;
  base_url?: string;
};

export default function RatioConfig() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [config, setConfig] = useState<RatioConfig>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resetting, setResetting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingRatios, setFetchingRatios] = useState(false);
  const [syncingModels, setSyncingModels] = useState(false);
  const [channelIdsInput, setChannelIdsInput] = useState("");
  const [syncableChannels, setSyncableChannels] = useState<SyncableChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfig(await api.getRatioConfig());
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load ratio configuration.", "无法加载比例配置。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  const loadSyncableChannels = useCallback(async () => {
    try {
      const value = (await api.syncableChannels()) as unknown;
      const list = Array.isArray(value)
        ? (value as SyncableChannel[])
        : [];
      setSyncableChannels(list);
    } catch {
      // Non-critical: silently ignore; the channel selector simply stays empty.
    }
  }, []);

  useEffect(() => {
    void load();
    void loadSyncableChannels();
  }, [load, loadSyncableChannels]);

  const rows = useMemo<Row[]>(() => {
    const names = new Set<string>();
    for (const key of RATIO_KEYS) {
      const map = readMap(config[key]);
      for (const name of Object.keys(map)) names.add(name);
    }
    const sorted = Array.from(names).sort();
    return sorted.map((name) => {
      const ratioMap = readMap(config.model_ratio);
      const completionMap = readMap(config.completion_ratio);
      const cacheMap = readMap(config.cache_ratio);
      const priceMap = readMap(config.model_price);
      return {
        name,
        model_ratio: ratioMap[name] ?? 0,
        completion_ratio: completionMap[name] ?? 0,
        cache_ratio: cacheMap[name] ?? 0,
        model_price: priceMap[name] ?? 0,
      };
    });
  }, [config]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(q));
  }, [rows, search]);

  const summary = useMemo(() => {
    const totalModels = rows.length;
    const customPrice = rows.filter((row) => (row.model_price as number) > 0).length;
    return { totalModels, customPrice };
  }, [rows]);

  async function resetModelRatio() {
    const ok = await confirm({
      title: t("Reset model ratios", "重置模型比例"),
      description: t(
        "Reset all model ratios to defaults? Existing overrides will be removed.",
        "重置全部模型比例为默认值？现有的覆盖项会被清除。",
      ),
      confirmText: t("Reset", "重置"),
      variant: "danger",
    });
    if (!ok) return;
    setResetting(true);
    setError(null);
    try {
      await api.resetModelRatio();
      toast.success({ message: t("Reset", "已重置") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Reset failed.", "重置失败。");
      setError(message);
      toast.error({ message });
    } finally {
      setResetting(false);
    }
  }

  async function refreshRatioConfig() {
    setRefreshing(true);
    setError(null);
    try {
      const value = await api.getRatioConfig();
      setConfig(value);
      toast.success({ message: t("Refreshed", "已刷新") });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Refresh failed.", "刷新失败。");
      setError(message);
      toast.error({ message });
    } finally {
      setRefreshing(false);
    }
  }

  function parseChannelIdsInput(value: string): number[] {
    return value
      .split(/[,\s]+/)
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry) && entry > 0);
  }

  async function fetchUpstreamRatios() {
    const ids = parseChannelIdsInput(channelIdsInput);
    if (ids.length === 0 && selectedChannels.length === 0) {
      setError(
        t(
          "Provide at least one channel ID before fetching upstream ratios.",
          "请在抓取上游倍率前至少输入一个渠道 ID。",
        ),
      );
      return;
    }
    const finalIds = selectedChannels.length > 0 ? selectedChannels : ids;
    setFetchingRatios(true);
    setError(null);
    try {
      await api.fetchUpstreamRatios(finalIds, 30);
      toast.success({
        message: t(
          `Fetched upstream ratios for ${finalIds.length} channel(s).`,
          `已抓取 ${finalIds.length} 个渠道的上游倍率。`,
        ),
      });
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Fetch upstream ratios failed.", "抓取上游倍率失败。");
      setError(message);
      toast.error({ message });
    } finally {
      setFetchingRatios(false);
    }
  }

  async function syncUpstreamModels() {
    setSyncingModels(true);
    setError(null);
    try {
      await api.syncUpstreamModels();
      toast.success({
        message: t("Upstream models synced.", "已同步上游模型。"),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Sync upstream models failed.", "同步上游模型失败。");
      setError(message);
      toast.error({ message });
    } finally {
      setSyncingModels(false);
    }
  }

  const columns = [
    {
      key: "name",
      title: t("Model", "模型"),
      render: (row: Row) => (
        <span className="font-mono text-[12px]">{row.name}</span>
      ),
    },
    {
      key: "model_ratio",
      title: t("Prompt ratio", "提示比例"),
      render: (row: Row) => (
        <span className="font-mono text-[12px]">
          {formatNumber(row.model_ratio)}
        </span>
      ),
    },
    {
      key: "completion_ratio",
      title: t("Completion ratio", "补全比例"),
      render: (row: Row) => (
        <span className="font-mono text-[12px]">
          {formatNumber(row.completion_ratio)}
        </span>
      ),
    },
    {
      key: "cache_ratio",
      title: t("Cache ratio", "缓存比例"),
      render: (row: Row) => (
        <span className="font-mono text-[12px]">
          {formatNumber(row.cache_ratio)}
        </span>
      ),
    },
    {
      key: "model_price",
      title: t("Fixed price", "固定价格"),
      render: (row: Row) => (
        <span className="font-mono text-[12px]">
          {formatNumber(row.model_price)}
        </span>
      ),
    },
  ];

  return (
    <PageContainer
      title={t("Pricing & Ratios", "价格与比例")}
      subtitle={t(
        "Inspect per-model prompt/completion/cache ratios and fixed prices exposed by the gateway.",
        "查看网关公开的每模型提示/补全/缓存比例和固定价格。",
      )}
      isLoading={loading}
      error={error}
      onRetry={load}
      actions={
        <>
          <button
            type="button"
            disabled={refreshing || loading}
            onClick={() => void refreshRatioConfig()}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {t("Refresh", "刷新")}
          </button>
          <button
            type="button"
            disabled={resetting || loading}
            onClick={() => void resetModelRatio()}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            {resetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            {t("Reset model ratios", "重置模型比例")}
          </button>
          <button
            type="button"
            disabled={fetchingRatios || loading}
            onClick={() => void fetchUpstreamRatios()}
            className="flex items-center gap-2 border border-[#121110] bg-inverse px-4 py-2 text-overline font-mono uppercase tracking-widest text-white disabled:opacity-50"
          >
            {fetchingRatios ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {t("Fetch upstream ratios", "抓取上游倍率")}
          </button>
          <button
            type="button"
            disabled={syncingModels || loading}
            onClick={() => void syncUpstreamModels()}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            {syncingModels ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {t("Sync upstream models", "同步上游模型")}
          </button>
        </>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-px border border-[#121110]/10 bg-inverse/10 md:grid-cols-2">
        <div className="bg-white p-6">
          <div className="mb-3 flex items-center justify-between text-overline font-mono uppercase tracking-widest text-muted">
            <span>{t("Configured models", "已配置模型")}</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-3xl font-serif">{summary.totalModels}</p>
        </div>
        <div className="bg-white p-6">
          <div className="mb-3 flex items-center justify-between text-overline font-mono uppercase tracking-widest text-muted">
            <span>{t("Models with fixed price", "固定价格模型")}</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-3xl font-serif">{summary.customPrice}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex min-w-72 items-center gap-2 border-b border-[#121110]/20 px-2 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Filter by model name", "按模型名过滤")}
            className="w-full bg-transparent text-[12px] outline-none"
          />
        </label>
        <input
          value={channelIdsInput}
          onChange={(event) => setChannelIdsInput(event.target.value)}
          placeholder={t("Channel IDs (comma-separated)", "渠道 ID（逗号分隔）")}
          className="min-w-72 border-b border-[#121110]/20 bg-transparent px-2 py-2 text-[12px] outline-none"
        />
        {syncableChannels.length > 0 && (
          <div className="min-w-64 flex-1"><MultiSelectMenu values={selectedChannels.map(String)} options={syncableChannels.map((channel) => ({ value: String(channel.id), label: `#${channel.id} · ${displayChannelName(channel.name ?? "")}` }))} onChange={(values) => setSelectedChannels(values.map(Number).filter(Number.isInteger))} placeholder={t("Select channels", "选择渠道")} /></div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        total={filteredRows.length}
        page={1}
        pageSize={Math.max(filteredRows.length, 10)}
        onPageChange={() => {
          /* single page */
        }}
      />
    </PageContainer>
  );
}
