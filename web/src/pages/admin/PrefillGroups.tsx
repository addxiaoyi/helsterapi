import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { SelectMenu } from "../../components/ui/SelectMenu";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type Group = {
  id: number;
  name: string;
  type: string;
  items: unknown;
  created_at?: number;
  updated_at?: number;
};

const blank = { name: "", type: "model", items: "[]" };
const KNOWN_TYPES = ["model", "tag", "endpoint", "group", "preset"];

export default function PrefillGroups() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<Group | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonPreview, setJsonPreview] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.prefillGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load prefill groups.", "无法加载预填充组。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Validate JSON and produce preview
  useEffect(() => {
    if (!form.items.trim()) {
      setJsonError(null);
      setJsonPreview(null);
      return;
    }
    try {
      const parsed = JSON.parse(form.items);
      setJsonError(null);
      setJsonPreview(parsed);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
      setJsonPreview(null);
    }
  }, [form.items]);

  function startEdit(group: Group) {
    setEditing(group);
    setForm({
      name: group.name,
      type: group.type,
      items: JSON.stringify(group.items ?? [], null, 2),
    });
  }

  function reset() {
    setEditing(null);
    setForm(blank);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (jsonError) {
      setError(t("Please fix the JSON before saving.", "保存前请修正 JSON。"));
      return;
    }
    if (!form.name.trim() || !form.type.trim()) {
      setError(t("Name and type are required.", "名称和类型必填。"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        type: form.type.trim(),
        items: jsonPreview,
      };
      if (editing) {
        await api.updatePrefillGroup({ id: editing.id, ...body });
      } else {
        await api.createPrefillGroup(body);
      }
      toast.success({ message: t("Saved", "已保存") });
      reset();
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to save prefill group.", "无法保存预填充组。");
      setError(message);
      toast.error({ message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(group: Group) {
    const ok = await confirm({
      title: t("Delete group", "删除组"),
      description: t("Delete this group?", "确定删除此组吗？"),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.deletePrefillGroup(group.id);
      toast.success({ message: t("Deleted", "已删除") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to delete group.", "无法删除预填充组。");
      setError(message);
      toast.error({ message });
    }
  }

  function loadTemplate(type: string) {
    const templates: Record<string, unknown> = {
      model: ["gpt-4o", "claude-3-5-sonnet", "gemini-2.0-flash"],
      tag: ["premium", "fast", "vision"],
      endpoint: ["https://api.openai.com", "https://api.anthropic.com"],
      group: ["vip", "default"],
      preset: { temperature: 0.7, max_tokens: 2048 },
    };
    setForm({
      ...form,
      type,
      items: JSON.stringify(templates[type] ?? [], null, 2),
    });
  }

  function exportGroups() {
    const blob = new Blob([JSON.stringify(groups, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prefill-groups-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importGroups() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          throw new Error("Expected an array of prefill groups");
        }
        let success = 0;
        for (const item of parsed) {
          const record = item as Partial<Group>;
          if (typeof record?.name !== "string" || typeof record?.type !== "string") {
            continue;
          }
          await api.createPrefillGroup({
            name: record.name,
            type: record.type,
            items: record.items ?? [],
          });
          success += 1;
        }
        toast.success({
          message: t(`Imported ${success} group(s).`, `已导入 ${success} 个组。`),
        });
        await load();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("Import failed", "导入失败");
        toast.error({ message: msg });
      }
    };
    input.click();
  }

  const filteredGroups = search
    ? groups.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.type.toLowerCase().includes(search.toLowerCase()),
      )
    : groups;

  const columns = [
    {
      key: "name",
      title: t("Name", "名称"),
      render: (g: Group) => (
        <span className="font-mono text-[12px]">{g.name}</span>
      ),
    },
    {
      key: "type",
      title: t("Type", "类型"),
      render: (g: Group) => (
        <span className="px-2 py-0.5 text-overline font-mono uppercase tracking-widest border border-[#121110]/20">
          {g.type}
        </span>
      ),
    },
    {
      key: "items",
      title: t("Items", "条目数"),
      render: (g: Group) => {
        const count = Array.isArray(g.items) ? g.items.length : Object.keys(g.items ?? {}).length;
        return <span className="font-mono text-[12px]">{count}</span>;
      },
    },
    {
      key: "updated",
      title: t("Updated", "更新时间"),
      render: (g: Group) => {
        const ts = g.updated_at ?? g.created_at ?? 0;
        if (!ts) return "-";
        const date = ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
        return (
          <span className="font-mono text-caption text-muted">
            {date.toLocaleString()}
          </span>
        );
      },
    },
    {
      key: "actions",
      title: "",
      render: (g: Group) => (
        <div className="flex items-center justify-end gap-3 text-muted">
          <button
            type="button"
            onClick={() => startEdit(g)}
            title={t("Edit", "编辑")}
            className="hover:text-[#121110]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void remove(g)}
            title={t("Delete", "删除")}
            className="hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title={t("Prefill Groups", "预填充组")}
      subtitle={t(
        "Manage reusable model, tag, and endpoint groups.",
        "管理可复用的模型、标签和端点组。",
      )}
      isLoading={loading}
      error={error}
      onRetry={load}
      actions={
        <>
          <button
            type="button"
            onClick={load}
            title={t("Refresh", "刷新")}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#121110]/20 text-muted hover:border-[#121110] hover:text-[#121110] disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={exportGroups}
            title={t("Export", "导出")}
            className="flex h-8 items-center gap-1.5 rounded border border-[#121110]/20 px-3 text-micro font-mono uppercase tracking-widest text-muted hover:border-[#121110] hover:text-[#121110]"
          >
            <Download className="h-3.5 w-3.5" />
            {t("Export", "导出")}
          </button>
          <button
            type="button"
            onClick={importGroups}
            title={t("Import", "导入")}
            className="flex h-8 items-center gap-1.5 rounded border border-[#121110]/20 px-3 text-micro font-mono uppercase tracking-widest text-muted hover:border-[#121110] hover:text-[#121110]"
          >
            <Upload className="h-3.5 w-3.5" />
            {t("Import", "导入")}
          </button>
        </>
      }
    >
      {/* Form */}
      <form
        onSubmit={save}
        className="mb-6 border border-[#121110]/10 bg-white p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg">
            {editing ? t("Edit Group", "编辑组") : t("New Group", "新建组")}
          </h2>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="text-overline font-mono uppercase tracking-widest text-muted hover:text-[#121110]"
            >
              {t("Cancel edit", "取消编辑")}
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            required
            placeholder={t("Name", "名称")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
          />
          <SelectMenu value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={KNOWN_TYPES.map((tp) => ({ value: tp, label: tp }))} />
          <div className="flex items-center gap-2">
            <span className="text-overline font-mono uppercase text-muted">
              {t("Template:", "模板：")}
            </span>
            {KNOWN_TYPES.map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => loadTemplate(tp)}
                className="border border-[#121110]/20 px-2 py-1 text-overline font-mono uppercase hover:border-[#121110]"
              >
                {tp}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
              {t("Items (JSON)", "条目 (JSON)")}
            </label>
            <textarea
              required
              rows={8}
              value={form.items}
              onChange={(e) => setForm({ ...form, items: e.target.value })}
              className={`w-full border bg-transparent p-2 font-mono text-[12px] outline-none ${
                jsonError ? "border-red-500" : "border-[#121110]/20"
              }`}
              placeholder='["gpt-4o", "claude-3-5-sonnet"]'
            />
            {jsonError && (
              <p className="mt-1 flex items-center gap-1 text-caption text-red-600">
                <AlertCircle className="h-3 w-3" />
                {jsonError}
              </p>
            )}
            {!jsonError && form.items.trim() && (
              <p className="mt-1 flex items-center gap-1 text-caption text-green-600">
                <Check className="h-3 w-3" />
                {t("Valid JSON", "JSON 有效")}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
              {t("Preview", "预览")}
            </label>
            <pre className="h-[14.5rem] w-full overflow-auto border border-[#121110]/10 bg-primary p-2 font-mono text-caption">
              {jsonPreview !== null ? JSON.stringify(jsonPreview, null, 2) : "// " + (jsonError || t("Enter valid JSON", "输入有效 JSON"))}
            </pre>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={saving || !!jsonError}
            className="flex items-center gap-2 bg-inverse px-4 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {editing ? t("Update", "更新") : t("Create", "创建")}
          </button>
        </div>
      </form>

      {/* Search */}
      <div className="mb-3 flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Filter groups...", "过滤组...")}
          className="max-w-xs border-b border-[#121110]/20 bg-transparent px-2 py-1 text-[12px] outline-none"
        />
        <span className="text-overline font-mono uppercase text-muted">
          {t(`${filteredGroups.length} groups`, `${filteredGroups.length} 个组`)}
        </span>
      </div>

      {/* List */}
      <DataTable
        columns={columns}
        data={filteredGroups}
        total={filteredGroups.length}
        page={1}
        pageSize={Math.max(filteredGroups.length, 10)}
        onPageChange={() => undefined}
      />
    </PageContainer>
  );
}
