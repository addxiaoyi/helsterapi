import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../lib/LanguageContext";
import {
  Box,
  Search,
  Filter,
  ChevronRight,
  CheckCircle,
  XCircle,
  Sparkles,
  Code,
  ImageIcon,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { useToast } from "../../components/ui/Toast";
import { DataTable } from "../../components/ui/DataTable";
import { ApiError, api, type ApiStatus, type UserGroups } from "../../lib/api";
import { SelectMenu } from "../../components/ui/SelectMenu";

type UserModel = {
  id: string;
  name: string;
  provider: string;
  price: string;
  tags: string[];
  category?: string;
  enabled?: boolean;
};

function normalizeModels(models: string[]): UserModel[] {
  return models
    .filter((model) => model.trim().length > 0)
    .map((model) => ({
      id: model,
      name: model,
      provider: "-",
      price: "-",
      tags: [],
      category: inferCategory(model),
      enabled: true,
    }));
}

function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  if (
    lower.includes("embed") ||
    lower.includes("向量") ||
    lower.includes("embedding")
  ) {
    return "embedding";
  }
  if (
    lower.includes("image") ||
    lower.includes("img") ||
    lower.includes("画图") ||
    lower.includes("图像") ||
    lower.includes("dall") ||
    lower.includes("stable") ||
    lower.includes("midjourney") ||
    lower.includes("sd-")
  ) {
    return "image";
  }
  if (
    lower.includes("code") ||
    lower.includes("coder") ||
    lower.includes("编程") ||
    lower.includes("代码")
  ) {
    return "code";
  }
  if (
    lower.includes("audio") ||
    lower.includes("speech") ||
    lower.includes("tts") ||
    lower.includes("whisper") ||
    lower.includes("语音")
  ) {
    return "audio";
  }
  return "chat";
}

const CATEGORY_OPTIONS: Array<{
  value: string;
  label: string;
  icon: React.ElementType;
}> = [
  { value: "all", label: "All", icon: Box },
  { value: "chat", label: "Chat", icon: Sparkles },
  { value: "embedding", label: "Embedding", icon: Code },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "code", label: "Code", icon: Code },
  { value: "audio", label: "Audio", icon: Cpu },
];

export default function UserModels() {
  const { t } = useLang();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<UserModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [drawingEnabled, setDrawingEnabled] = useState(true);
  const [groups, setGroups] = useState<UserGroups>({});
  const [selectedGroup, setSelectedGroup] = useState("");

  const loadModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [models, status, usableGroups] = await Promise.all([
        api.userModels(selectedGroup || undefined),
        api.status(),
        api.userGroups(),
      ]);
      setDrawingEnabled((status as ApiStatus).enable_drawing !== false);
      setData(normalizeModels(models));
      setGroups(usableGroups);
    } catch (cause) {
      const msg =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load model list.", "无法加载模型列表。");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, t]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (!drawingEnabled && category === "image") setCategory("all");
  }, [category, drawingEnabled]);

  const categoryOptions = useMemo(
    () =>
      drawingEnabled
        ? CATEGORY_OPTIONS
        : CATEGORY_OPTIONS.filter((option) => option.value !== "image"),
    [drawingEnabled],
  );

  const filtered = useMemo(() => {
    return data.filter((model) => {
      const matchesSearch =
        search.trim() === "" ||
        model.name.toLowerCase().includes(search.toLowerCase()) ||
        model.provider.toLowerCase().includes(search.toLowerCase()) ||
        model.tags.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase()),
        );
      const matchesCategory = category === "all" || model.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [data, search, category]);

  const columns = [
    {
      key: "model",
      title: t("Model", "模型"),
      render: (r: UserModel) => (
        <div className="flex flex-col">
          <span className="font-medium text-[#121110]">{r.name}</span>
          <span className="text-caption text-muted font-mono">{r.id}</span>
        </div>
      ),
    },
    {
      key: "provider",
      title: t("Provider", "供应商"),
      render: (r: UserModel) => r.provider,
    },
    {
      key: "category",
      title: t("Category", "分类"),
      render: (r: UserModel) => {
        const matched = CATEGORY_OPTIONS.find((c) => c.value === r.category);
        return (
          <span className="inline-flex items-center gap-1.5 text-overline font-mono uppercase tracking-widest text-[#121110]/60">
            {matched ? (
              <matched.icon className="w-3 h-3" strokeWidth={1.5} />
            ) : (
              <Box className="w-3 h-3" strokeWidth={1.5} />
            )}
            {matched
              ? typeof matched.label === "string"
                ? t(matched.label, matched.label)
                : matched.label
              : r.category}
          </span>
        );
      },
    },
    {
      key: "price",
      title: t("Pricing", "计费"),
      render: (r: UserModel) => (
        <span className="font-mono text-caption text-muted">{r.price}</span>
      ),
    },
    {
      key: "status",
      title: t("Status", "状态"),
      render: (r: UserModel) => {
        const active = r.enabled;
        return (
          <span className="inline-flex items-center gap-1.5">
            {active ? (
              <CheckCircle
                className="w-4 h-4 text-green-600"
                strokeWidth={1.5}
              />
            ) : (
              <XCircle className="w-4 h-4 text-muted" strokeWidth={1.5} />
            )}
            <span
              className={`text-overline font-mono uppercase tracking-widest ${
                active ? "text-green-700" : "text-muted"
              }`}
            >
              {active ? t("Active", "启用") : t("Inactive", "停用")}
            </span>
          </span>
        );
      },
    },
    {
      key: "tags",
      title: t("Tags", "标签"),
      render: (r: UserModel) => (
        <div className="flex flex-wrap gap-1.5">
          {r.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-inverse/5 text-[9px] font-mono uppercase tracking-widest text-[#121110]/70"
            >
              {tag}
            </span>
          ))}
          {r.tags.length === 0 && (
            <span className="text-caption text-muted">-</span>
          )}
        </div>
      ),
    },
    {
      key: "_action",
      title: "",
      render: (r: UserModel) => (
        <button
          onClick={() =>
            navigate(`/chat/new?model=${encodeURIComponent(r.id)}`)
          }
          className="w-full flex items-center justify-end gap-2 text-overline font-mono uppercase tracking-widest text-[#121110] hover:text-[#121110]/70 transition-colors"
        >
          <span>{t("Use", "使用")}</span>
          <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
        </button>
      ),
    },
  ];

  const categoryNodes = (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="w-3.5 h-3.5 text-muted" strokeWidth={1.5} />
      {categoryOptions.map((opt) => {
        const active = category === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setCategory(opt.value)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-overline font-mono uppercase tracking-widest transition-all duration-300 ${
              active
                ? "bg-inverse text-[#FAFAFA]"
                : "border border-[#121110]/10 text-[#121110]/50 hover:border-[#121110]/30 hover:text-[#121110]"
            }`}
          >
            {active ? (
              <opt.icon className="w-3 h-3 text-[#FAFAFA]" strokeWidth={2} />
            ) : (
              <opt.icon className="w-3 h-3" strokeWidth={1.5} />
            )}
            <span>
              {typeof opt.label === "string"
                ? t(opt.label, opt.label)
                : opt.label}
            </span>
          </button>
        );
      })}
      <SelectMenu value={selectedGroup} onChange={setSelectedGroup} ariaLabel={t("Filter by group", "按分组筛选")} options={[{ value: "", label: t("All usable groups", "全部可用分组") }, ...Object.keys(groups).sort().map((group) => ({ value: group, label: `${group} · ${groups[group].desc || t("No description", "暂无介绍")} · ×${groups[group].ratio}` }))]} />
    </div>
  );

  return (
    <PageContainer
      title={t("Available Models", "可用模型")}
      subtitle={t(
        "Browse models available to your current subscription tier.",
        "浏览您当前订阅级别可用的模型。",
      )}
      isLoading={loading}
      error={error}
      onRetry={() => {
        void loadModels();
      }}
    >
      <div className="bg-white border border-[#121110]/5 shadow-[0_4px_24px_rgb(0,0,0,0.02)] flex flex-col min-h-[60vh]">
        {/* Header with model icon, search bar, and category filter */}
        <div className="p-6 border-b border-[#121110]/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Box className="w-4 h-4 text-[#121110]" strokeWidth={1.5} />
              <h3 className="text-label font-medium text-[#121110]">
                {t("Model Directory", "模型目录")}
              </h3>
            </div>
            <div className="flex items-center gap-4">
              {/* Category filter */}
              {categoryNodes}
              {/* Refresh button */}
              <button
                type="button"
                onClick={() => void loadModels()}
                disabled={loading}
                title={t("Refresh", "刷新")}
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#121110]/10 text-[#121110]/60 transition-colors hover:border-[#121110] hover:text-[#121110] disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              {/* Search bar */}
              <div className="relative w-full sm:w-56">
                <Search
                  className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("Search models...", "搜索模型...")}
                  className="w-full rounded-none border border-[#121110]/10 bg-transparent py-2 pl-9 pr-3 text-label font-mono text-[#121110] outline-none transition-colors placeholder:text-[#121110]/30 focus:border-[#121110]"
                />
              </div>
            </div>
          </div>
          {(search || category !== "all") && (
            <div className="mt-3 flex items-center gap-2 text-overline font-mono uppercase tracking-widest text-muted">
              <span>
                {t("Filtered", "已筛选")}: {filtered.length}/{data.length}{" "}
                {t("models", "个模型")}
              </span>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-[#121110]/50 hover:text-[#121110] underline underline-offset-2"
                >
                  {t("Clear", "清除")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Model list */}
        <div className="flex-1 overflow-y-auto">
          <DataTable
            columns={columns}
            data={filtered}
            total={filtered.length}
            page={1}
            pageSize={15}
            onPageChange={() => undefined}
          />
        </div>
      </div>
    </PageContainer>
  );
}
