import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Download,
  Edit2,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type KeySource = {
  type?: string;
  key?: string;
  path?: string;
};

type Rule = {
  id?: string | number;
  name: string;
  model_regex?: string[];
  path_regex?: string[];
  user_agent_include?: string[];
  key_sources?: KeySource[];
  value_regex?: string;
  ttl_seconds?: number;
  param_override_template?: Record<string, unknown>;
  skip_retry_on_failure?: boolean;
  include_using_group?: boolean;
  include_model_name?: boolean;
  include_rule_name?: boolean;
};

type Setting = {
  enabled?: boolean;
  switch_on_success?: boolean;
  keep_on_channel_disabled?: boolean;
  max_entries?: number;
  default_ttl_seconds?: number;
  rules?: Rule[];
};

type CacheStats = {
  enabled?: boolean;
  total?: number;
  unknown?: number;
  by_rule_name?: Record<string, number>;
  cache_capacity?: number;
  cache_algo?: string;
};

const EMPTY_RULE: Rule = {
  name: "",
  model_regex: [],
  path_regex: [],
  user_agent_include: [],
  key_sources: [],
  value_regex: "",
  ttl_seconds: 0,
  skip_retry_on_failure: false,
  include_using_group: true,
  include_model_name: false,
  include_rule_name: true,
};

const SETTING_KEY = "channel_affinity_setting";

const DEFAULT_SETTING: Setting = {
  enabled: false,
  switch_on_success: true,
  keep_on_channel_disabled: false,
  max_entries: 100_000,
  default_ttl_seconds: 3600,
  rules: [],
};

function readNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalize(value: unknown): Setting {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTING };
  const obj = value as Record<string, unknown>;
  return {
    enabled: Boolean(obj.enabled),
    switch_on_success: obj.switch_on_success !== false,
    keep_on_channel_disabled: Boolean(obj.keep_on_channel_disabled),
    max_entries: readNumber(obj.max_entries, DEFAULT_SETTING.max_entries ?? 100000),
    default_ttl_seconds: readNumber(
      obj.default_ttl_seconds,
      DEFAULT_SETTING.default_ttl_seconds ?? 3600,
    ),
    rules: Array.isArray(obj.rules)
      ? (obj.rules as Rule[])
      : [],
  };
}

function parseList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function stringifyList(items: string[] | undefined): string {
  return Array.isArray(items) ? items.join("\n") : "";
}

function parseKeySources(text: string): KeySource[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [type, key, path] = line.split("|").map((s) => s.trim());
      return {
        type: type || "gjson",
        key: key || undefined,
        path: path || undefined,
      };
    });
}

function stringifyKeySources(items: KeySource[] | undefined): string {
  if (!Array.isArray(items)) return "";
  return items
    .map((item) => [item.type ?? "", item.key ?? "", item.path ?? ""].join("|"))
    .join("\n");
}

export default function ChannelAffinity() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [setting, setSetting] = useState<Setting>({ ...DEFAULT_SETTING });
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [clearing, setClearing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ open: boolean; index: number | null; rule: Rule }>(
    { open: false, index: null, rule: { ...EMPTY_RULE } },
  );

  function buildRules(): Rule[] {
    return setting.rules ?? [];
  }

  function escapeCSV(value: string): string {
    if (value == null) return "";
    const text = String(value);
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function toCSV(rules: Rule[]): string {
    const header = [
      "name",
      "model_regex",
      "path_regex",
      "user_agent_include",
      "value_regex",
      "ttl_seconds",
      "skip_retry_on_failure",
      "include_using_group",
      "include_model_name",
      "include_rule_name",
    ];
    const lines = [header.join(",")];
    for (const rule of rules) {
      lines.push(
        [
          rule.name,
          (rule.model_regex ?? []).join("|"),
          (rule.path_regex ?? []).join("|"),
          (rule.user_agent_include ?? []).join("|"),
          rule.value_regex ?? "",
          rule.ttl_seconds ?? 0,
          rule.skip_retry_on_failure ? "1" : "0",
          rule.include_using_group ? "1" : "0",
          rule.include_model_name ? "1" : "0",
          rule.include_rule_name ? "1" : "0",
        ]
          .map((v) => escapeCSV(String(v)))
          .join(","),
      );
    }
    return lines.join("\n");
  }

  function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let current: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"' && text[i + 1] === '"') {
          field += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          field += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ",") {
          current.push(field);
          field = "";
        } else if (char === "\n" || char === "\r") {
          if (field !== "" || current.length > 0) {
            current.push(field);
            rows.push(current);
          }
          current = [];
          field = "";
          if (char === "\r" && text[i + 1] === "\n") i++;
        } else {
          field += char;
        }
      }
    }
    if (field !== "" || current.length > 0) {
      current.push(field);
      rows.push(current);
    }
    return rows;
  }

  function parseBool(value: string): boolean {
    return value === "1" || value.toLowerCase() === "true" || value === "yes";
  }

  function rowToRule(row: string[]): Rule | null {
    if (row.length === 0) return null;
    const [name, mr, pr, ua, vr, ttl, skip, iug, imn, irn] = row;
    if (!name) return null;
    return {
      name,
      model_regex: mr ? mr.split("|").filter(Boolean) : [],
      path_regex: pr ? pr.split("|").filter(Boolean) : [],
      user_agent_include: ua ? ua.split("|").filter(Boolean) : [],
      value_regex: vr || "",
      ttl_seconds: Number(ttl) || 0,
      skip_retry_on_failure: parseBool(skip ?? "0"),
      include_using_group: iug === "" ? true : parseBool(iug),
      include_model_name: parseBool(imn ?? "0"),
      include_rule_name: irn === "" ? true : parseBool(irn),
    };
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await api.getChannelAffinitySetting();
      // raw may be an array (from option list) or object (from withQuery single)
      let value: unknown = raw;
      if (Array.isArray(raw)) {
        const match = (raw as Array<{ key: string; value: string }>).find(
          (item) => item.key === SETTING_KEY,
        );
        if (match) {
          try {
            value = JSON.parse(match.value);
          } catch {
            value = match.value;
          }
        }
      } else if (raw && typeof raw === "object" && "value" in (raw as Record<string, unknown>)) {
        const inner = (raw as { value: unknown }).value;
        if (typeof inner === "string") {
          try {
            value = JSON.parse(inner);
          } catch {
            value = inner;
          }
        } else {
          value = inner;
        }
      }
      setSetting(normalize(value));
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load channel affinity setting.", "无法加载渠道亲和性配置。");
      setError(message);
      toast.error({ message });
      setSetting({ ...DEFAULT_SETTING });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  const loadStats = useCallback(async () => {
    try {
      const payload = await api.channelAffinityCache();
      setStats((payload as CacheStats) ?? null);
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadStats();
  }, [load, loadStats]);

  async function saveSetting(updates: Partial<Setting>) {
    setSaving(true);
    setError(null);
    setBanner(null);
    try {
      const next = { ...setting, ...updates };
      await api.updateChannelAffinitySetting(next as unknown as Record<string, unknown>);
      setSetting(next);
      setBanner(t("Settings saved.", "设置已保存。"));
      toast.success({ message: t("Saved", "已保存") });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to save channel affinity setting.", "无法保存渠道亲和性配置。");
      setError(message);
      toast.error({ message });
    } finally {
      setSaving(false);
    }
  }

  async function exportTemplate() {
    setError(null);
    const rules = buildRules();
    const csv = toCSV(rules);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "channel-affinity-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function importAffinity() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      setError(null);
      try {
        const text = await file.text();
        const rows = parseCSV(text);
        const imported: Rule[] = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rule = rowToRule(row);
          if (!rule) continue;
          imported.push(rule);
        }
        if (imported.length === 0) {
          toast.info({ message: t("No valid rules found in file", "文件中未找到有效规则") });
          setImporting(false);
          return;
        }
        const current = buildRules();
        const merged = [...current, ...imported];
        await api.updateChannelAffinitySetting({ rules: merged });
        setBanner(`${t("Imported", "已导入")} ${imported.length} ${t("rule(s).", "条规则。")}`);
        toast.success({ message: `${t("Imported", "已导入")} ${imported.length} ${t("rule(s)", "条规则")}` });
        await load();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("Import failed", "导入失败");
        setError(msg);
        toast.error({ message: msg });
      } finally {
        setImporting(false);
      }
    };
    input.click();
  }

  async function clearCache() {
    const ok = await confirm({
      title: t("Clear cache", "清空缓存"),
      description: t(
        "Clear the affinity cache? Active sessions will lose their cached channels.",
        "清空亲和性缓存？活跃会话会丢失缓存的渠道。",
      ),
      confirmText: t("Clear", "清空"),
      variant: "danger",
    });
    if (!ok) return;
    setClearing(true);
    setError(null);
    try {
      await api.clearChannelAffinityCache();
      setBanner(t("Affinity cache cleared.", "亲和性缓存已清空。"));
      toast.success({ message: t("Cache cleared", "缓存已清空") });
      await loadStats();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to clear affinity cache.", "无法清空亲和性缓存。");
      setError(message);
      toast.error({ message });
    } finally {
      setClearing(false);
    }
  }

  function openCreate() {
    setEditing({ open: true, index: null, rule: { ...EMPTY_RULE } });
  }

  function openEdit(index: number) {
    const rule = setting.rules?.[index];
    if (!rule) return;
    setEditing({ open: true, index, rule: { ...rule } });
  }

  function closeEditor() {
    setEditing({ open: false, index: null, rule: { ...EMPTY_RULE } });
  }

  function saveRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = editing.rule;
    if (!draft.name.trim()) {
      setError(t("Rule name is required.", "规则名称必填。"));
      return;
    }
    const next: Rule[] = [...(setting.rules ?? [])];
    if (editing.index === null) {
      next.push(draft);
    } else {
      next[editing.index] = draft;
    }
    void saveSetting({ rules: next }).then(() => {
      closeEditor();
    });
  }

  async function deleteRule(index: number) {
    const ok = await confirm({
      title: t("Delete rule", "删除规则"),
      description: t(
        "Delete this affinity rule? This cannot be undone.",
        "确定删除该亲和性规则？此操作不可恢复。",
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    const next = [...(setting.rules ?? [])];
    next.splice(index, 1);
    await saveSetting({ rules: next });
    toast.success({ message: t("Rule deleted", "规则已删除") });
  }

  const ruleRows = useMemo(() => {
    return (setting.rules ?? []).map((rule, index) => ({
      ...rule,
      id: `${index}-${rule.name}`,
    }));
  }, [setting.rules]);

  const filteredRuleRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return ruleRows;
    return ruleRows.filter((row) => row.name.toLowerCase().includes(q));
  }, [ruleRows, search]);

  const columns = [
    {
      key: "name",
      title: t("Name", "名称"),
      render: (rule: Rule & { _id?: string }) => (
        <span className="font-mono text-[12px]">{rule.name}</span>
      ),
    },
    {
      key: "model_regex",
      title: t("Model regex", "模型正则"),
      render: (rule: Rule) => (
        <span className="font-mono text-caption text-muted">
          {(rule.model_regex ?? []).slice(0, 2).join(", ")}
          {(rule.model_regex?.length ?? 0) > 2 ? "…" : ""}
        </span>
      ),
    },
    {
      key: "path_regex",
      title: t("Path regex", "路径正则"),
      render: (rule: Rule) => (
        <span className="font-mono text-caption text-muted">
          {(rule.path_regex ?? []).slice(0, 2).join(", ")}
          {(rule.path_regex?.length ?? 0) > 2 ? "…" : ""}
        </span>
      ),
    },
    {
      key: "ttl_seconds",
      title: t("TTL (s)", "TTL (秒)"),
      render: (rule: Rule) => (
        <span className="font-mono text-[12px]">
          {readNumber(rule.ttl_seconds, 0)}
        </span>
      ),
    },
    {
      key: "key_sources",
      title: t("Key sources", "键来源"),
      render: (rule: Rule) => (
        <span className="text-caption text-muted">
          {(rule.key_sources ?? []).length}
        </span>
      ),
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (rule: Rule & { _id?: string }) => {
        const index = Number((rule as { _id?: string })._id?.split("-")[0] ?? -1);
        return (
          <div className="flex items-center gap-3 text-muted">
            <button
              type="button"
              title={t("Edit", "编辑")}
              onClick={() => openEdit(index)}
              className="hover:text-[#121110]"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title={t("Delete", "删除")}
              onClick={() => deleteRule(index)}
              className="hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <PageContainer
      title={t("Channel Affinity", "渠道亲和性")}
      subtitle={t(
        "Pin upstream channels to the same client for prompt caching and conversation continuity.",
        "将上游渠道与同一客户端绑定，以支持 prompt 缓存和会话连续性。",
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
          <button
            type="button"
            onClick={() => void exportTemplate()}
            disabled={loading}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {t("Export template", "导出模板")}
          </button>
          <button
            type="button"
            onClick={() => void importAffinity()}
            disabled={importing}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {t("Import", "导入")}
          </button>
          <button
            type="button"
            onClick={() => void clearCache()}
            disabled={clearing}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            {clearing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {t("Clear cache", "清空缓存")}
          </button>
        </>
      }
    >
      {banner && (
        <div className="mb-4 flex items-center gap-2 border border-green-700 bg-green-50 px-4 py-2 text-[12px] text-green-800">
          <Check className="h-4 w-4" /> {banner}
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-px border border-[#121110]/10 bg-inverse/10 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6">
          <div className="mb-3 flex items-center justify-between text-overline font-mono uppercase tracking-widest text-muted">
            <span>{t("Cache enabled", "缓存启用")}</span>
            <Power className="h-4 w-4" />
          </div>
          <p
            className={`text-2xl font-serif ${setting.enabled ? "text-green-700" : "text-muted"}`}
          >
            {setting.enabled ? t("Active", "已启用") : t("Disabled", "未启用")}
          </p>
        </div>
        <div className="bg-white p-6">
          <div className="mb-3 text-overline font-mono uppercase tracking-widest text-muted">
            {t("Cached entries", "缓存条目")}
          </div>
          <p className="text-2xl font-serif">
            {stats?.total ?? 0} / {stats?.cache_capacity ?? "-"}
          </p>
        </div>
        <div className="bg-white p-6">
          <div className="mb-3 text-overline font-mono uppercase tracking-widest text-muted">
            {t("Default TTL", "默认 TTL")}
          </div>
          <p className="text-2xl font-serif">
            {readNumber(setting.default_ttl_seconds, 0)}s
          </p>
        </div>
        <div className="bg-white p-6">
          <div className="mb-3 text-overline font-mono uppercase tracking-widest text-muted">
            {t("Active rules", "生效规则")}
          </div>
          <p className="text-2xl font-serif">{ruleRows.length}</p>
        </div>
      </section>

      <section className="mb-6 border border-[#121110]/10 bg-white p-6">
        <h2 className="mb-4 font-serif text-xl">
          {t("Global behavior", "全局行为")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              key: "enabled" as const,
              label: t("Enable affinity cache", "启用亲和性缓存"),
              description: t(
                "Activate the affinity cache and start pinning channels to clients.",
                "启用亲和性缓存，开始将渠道与客户端绑定。",
              ),
            },
            {
              key: "switch_on_success" as const,
              label: t("Switch on success", "成功后切换"),
              description: t(
                "Reassign the cached channel after a successful retry.",
                "重试成功后重新分配缓存的渠道。",
              ),
            },
            {
              key: "keep_on_channel_disabled" as const,
              label: t("Keep on disabled channel", "渠道禁用时保留"),
              description: t(
                "Retain the cache entry when the bound channel is disabled.",
                "绑定的渠道被禁用时仍保留缓存条目。",
              ),
            },
          ].map((row) => (
            <label
              key={row.key}
              className="flex items-start gap-3 border border-[#121110]/10 p-3"
            >
              <input
                type="checkbox"
                checked={Boolean(setting[row.key])}
                disabled={saving}
                onChange={(event) =>
                  void saveSetting({ [row.key]: event.target.checked } as Partial<Setting>)
                }
                className="mt-1 h-4 w-4 accent-[#121110] disabled:opacity-50"
              />
              <div>
                <span className="block text-[12px] font-medium">
                  {row.label}
                </span>
                <span className="mt-0.5 block text-caption text-muted">
                  {row.description}
                </span>
              </div>
            </label>
          ))}
          <label className="flex flex-col gap-1 border border-[#121110]/10 p-3">
            <span className="text-overline font-mono uppercase tracking-widest text-muted">
              {t("Max entries", "最大条目数")}
            </span>
            <input
              type="number"
              min="0"
              value={setting.max_entries ?? 0}
              onChange={(event) =>
                void saveSetting({ max_entries: readNumber(event.target.value) })
              }
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-1 text-label outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 border border-[#121110]/10 p-3">
            <span className="text-overline font-mono uppercase tracking-widest text-muted">
              {t("Default TTL (seconds)", "默认 TTL (秒)")}
            </span>
            <input
              type="number"
              min="0"
              value={setting.default_ttl_seconds ?? 0}
              onChange={(event) =>
                void saveSetting({ default_ttl_seconds: readNumber(event.target.value) })
              }
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-1 text-label outline-none"
            />
          </label>
        </div>
      </section>

      <section className="border border-[#121110]/10 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl">
            {t("Affinity rules", "亲和性规则")}
          </h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 border-b border-[#121110]/20 px-2 py-2">
              <Search className="h-4 w-4 text-muted" />
              <input
                id="affinity-rule-search"
                placeholder={t("Filter by rule name", "按规则名过滤")}
                className="w-48 bg-transparent text-[12px] outline-none"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 bg-inverse text-[#FAFAFA] px-4 py-2 text-overline font-mono uppercase"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("New rule", "新建规则")}
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredRuleRows}
          total={filteredRuleRows.length}
          page={1}
          pageSize={Math.max(filteredRuleRows.length, 10)}
          onPageChange={() => {
            /* single page */
          }}
        />
      </section>

      {editing.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-inverse/40 p-6">
          <form
            onSubmit={saveRule}
            className="max-h-[90vh] w-full max-w-3xl space-y-5 overflow-auto border border-[#121110]/10 bg-primary p-8 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">
                {editing.index === null
                  ? t("New rule", "新建规则")
                  : t("Edit rule", "编辑规则")}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="text-sm"
                aria-label="close"
              >
                ×
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 space-y-1 text-overline font-mono uppercase">
                <span>{t("Name", "名称")}</span>
                <input
                  required
                  value={editing.rule.name}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      rule: { ...current.rule, name: event.target.value },
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Model regex (one per line)", "模型正则（每行一条）")}</span>
                <textarea
                  rows={3}
                  value={stringifyList(editing.rule.model_regex)}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      rule: {
                        ...current.rule,
                        model_regex: parseList(event.target.value),
                      },
                    }))
                  }
                  className="w-full border border-[#121110]/20 bg-transparent p-2 text-[12px] font-mono outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Path regex (one per line)", "路径正则（每行一条）")}</span>
                <textarea
                  rows={3}
                  value={stringifyList(editing.rule.path_regex)}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      rule: {
                        ...current.rule,
                        path_regex: parseList(event.target.value),
                      },
                    }))
                  }
                  className="w-full border border-[#121110]/20 bg-transparent p-2 text-[12px] font-mono outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("User-Agent include", "User-Agent 包含")}</span>
                <textarea
                  rows={2}
                  value={stringifyList(editing.rule.user_agent_include)}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      rule: {
                        ...current.rule,
                        user_agent_include: parseList(event.target.value),
                      },
                    }))
                  }
                  className="w-full border border-[#121110]/20 bg-transparent p-2 text-[12px] font-mono outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Value regex", "值正则")}</span>
                <input
                  value={editing.rule.value_regex ?? ""}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      rule: { ...current.rule, value_regex: event.target.value },
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("TTL (seconds)", "TTL (秒)")}</span>
                <input
                  type="number"
                  min="0"
                  value={editing.rule.ttl_seconds ?? 0}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      rule: {
                        ...current.rule,
                        ttl_seconds: readNumber(event.target.value),
                      },
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="sm:col-span-2 space-y-1 text-overline font-mono uppercase">
                <span>
                  {t(
                    "Key sources (type|key|path, one per line)",
                    "键来源（type|key|path，每行一条）",
                  )}
                </span>
                <textarea
                  rows={3}
                  value={stringifyKeySources(editing.rule.key_sources)}
                  onChange={(event) =>
                    setEditing((current) => ({
                      ...current,
                      rule: {
                        ...current.rule,
                        key_sources: parseKeySources(event.target.value),
                      },
                    }))
                  }
                  className="w-full border border-[#121110]/20 bg-transparent p-2 text-[12px] font-mono outline-none"
                  placeholder="gjson|prompt_cache_key|"
                />
              </label>
              <label className="sm:col-span-2 space-y-1 text-overline font-mono uppercase">
                <span>
                  {t(
                    "Param override template (JSON)",
                    "参数覆盖模板 (JSON)",
                  )}
                </span>
                <textarea
                  rows={4}
                  value={JSON.stringify(editing.rule.param_override_template ?? {}, null, 2)}
                  onChange={(event) => {
                    try {
                      const parsed = event.target.value
                        ? JSON.parse(event.target.value)
                        : {};
                      setEditing((current) => ({
                        ...current,
                        rule: { ...current.rule, param_override_template: parsed },
                      }));
                    } catch {
                      // ignore invalid JSON until valid
                    }
                  }}
                  className="w-full border border-[#121110]/20 bg-transparent p-2 text-[12px] font-mono outline-none"
                />
              </label>
              {[
                {
                  key: "skip_retry_on_failure" as const,
                  label: t("Skip retry on failure", "失败时跳过重试"),
                },
                {
                  key: "include_using_group" as const,
                  label: t("Include using group", "包含使用分组"),
                },
                {
                  key: "include_model_name" as const,
                  label: t("Include model name", "包含模型名"),
                },
                {
                  key: "include_rule_name" as const,
                  label: t("Include rule name", "包含规则名"),
                },
              ].map((toggle) => (
                <label
                  key={toggle.key}
                  className="flex items-center gap-2 border border-[#121110]/10 p-2 text-[12px]"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(editing.rule[toggle.key])}
                    onChange={(event) =>
                      setEditing((current) => ({
                        ...current,
                        rule: { ...current.rule, [toggle.key]: event.target.checked },
                      }))
                    }
                    className="h-4 w-4 accent-[#121110]"
                  />
                  {toggle.label}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
              >
                {t("Cancel", "取消")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-inverse px-5 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
              >
                {saving ? t("Saving...", "保存中...") : t("Save", "保存")}
              </button>
            </div>
          </form>
        </div>
      )}
    </PageContainer>
  );
}
