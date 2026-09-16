import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus, RefreshCw, Trash2, Edit2, Eye, Download, Upload } from "lucide-react";
import { PageContainer } from "../components/ui/PageContainer";
import { DataTable } from "../components/ui/DataTable";
import { ApiError, api, type ApiModel } from "../lib/api";
import { useLang } from "../lib/LanguageContext";
import { useToast } from "../components/ui/Toast";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { downloadCsv, downloadJson, pickFile, readFileAsText, importCsvAsRecords, type CsvColumn } from "../lib/io";
import { ModelBadge, StatusBadge } from "../components/ui/StatusBadge";
import { FormSection } from "../components/ui/FormFields";
import { SelectMenu } from "../components/ui/SelectMenu";
import { ActionMenu } from "../components/ui/ActionMenu";
import { useTableUrlState } from "../lib/useTableUrlState";

const PAGE_SIZE = 10;

type ModelForm = {
  model_name: string;
  description: string;
  icon: string;
  tags: string;
  vendor_id: number;
  model_ratio: number;
  completion_ratio: number;
  status: number;
  sync_official: number;
  name_rule: number;
  endpoints: string;
  enable_groups: string;
  quota_types: string;
};

function splitList(value: string) {
  return value
    .split(/[,\r\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseQuotaTypes(value: string) {
  const items = splitList(value);
  if (items.some((item) => item !== "0" && item !== "1")) return null;
  return Array.from(new Set(items.map(Number)));
}

export default function Models() {
  const { t } = useLang();
  const location = useLocation();
  const modelSection = location.pathname.split("/")[2] ?? "metadata";
  const toast = useToast();
  const confirm = useConfirm();
  const [models, setModels] = useState<ApiModel[]>([]);
  const [total, setTotal] = useState(0);
  const { page, search, setPage, setSearch } = useTableUrlState();
  const [statusFilter, setStatusFilter] = useState("");
  const [syncFilter, setSyncFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<ApiModel | null | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
  const [batchWorking, setBatchWorking] = useState(false);
  const [form, setForm] = useState<ModelForm>({
    model_name: "",
    description: "",
    icon: "",
    tags: "",
    vendor_id: 0,
    model_ratio: 1,
    completion_ratio: 1,
    status: 1,
    sync_official: 1,
    name_rule: 0,
    endpoints: "",
    enable_groups: "",
    quota_types: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncPayload, setSyncPayload] = useState<unknown>(null);
  const [details, setDetails] = useState<ApiModel | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .models(page, search, {
        status: statusFilter || undefined,
        sync_official: syncFilter || undefined,
      })
      .then((result) => {
        setModels(result.items ?? []);
        setTotal(result.total ?? 0);
      })
      .catch((cause) =>
        setError(
          cause instanceof ApiError ? cause.message : "无法读取模型列表。",
        ),
      )
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, syncFilter]);

  async function deleteModel(model: ApiModel) {
    const ok = await confirm({
      title: t("Delete Model", "删除模型"),
      description: t(
        `Delete model "${model.model_name}"? This cannot be undone.`,
        `确定删除模型 "${model.model_name}"？此操作不可恢复。`,
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteModel(model.id);
      setModels((current) => current.filter((item) => item.id !== model.id));
      setTotal((current) => Math.max(current - 1, 0));
      toast.success({ message: t("Model deleted", "模型已删除") });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to delete model.", "无法删除模型。");
      setError(message);
      toast.error({ message });
    }
  }

  function openEditor(model?: ApiModel) {
    setEditor(model ?? null);
    setFormError(null);
    setForm({
      model_name: model?.model_name ?? "",
      description: model?.description ?? "",
      icon: model?.icon ?? "",
      tags: model?.tags ?? "",
      vendor_id: model?.vendor_id ?? 0,
      model_ratio: model?.model_ratio ?? 1,
      completion_ratio: model?.completion_ratio ?? 1,
      status: model?.status ?? 1,
      sync_official: model?.sync_official ?? 1,
      name_rule: model?.name_rule ?? 0,
      endpoints: model?.endpoints ?? "",
      enable_groups: model?.enable_groups?.join(",") ?? "",
      quota_types: model?.quota_types?.join(",") ?? "",
    });
  }

  async function saveModel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const modelName = form.model_name.trim();
    const promptRatio = Number(form.model_ratio);
    const completionRatio = Number(form.completion_ratio);
    const vendorId = Number(form.vendor_id);
    const endpoints = form.endpoints.trim();
    const quotaTypes = parseQuotaTypes(form.quota_types);
    const isValidEndpoints = (() => {
      if (!endpoints) return true;
      try {
        JSON.parse(endpoints);
        return true;
      } catch {
        return false;
      }
    })();
    const validationMessage = !modelName
      ? t("Model name is required.", "请输入模型名称。")
      : !Number.isFinite(vendorId) || !Number.isInteger(vendorId) || vendorId < 0
        ? t("Vendor ID must be a non-negative integer.", "供应商 ID 必须是非负整数。")
        : !Number.isFinite(promptRatio) || promptRatio < 0 || !Number.isFinite(completionRatio) || completionRatio < 0
          ? t("Ratios must be non-negative numbers.", "倍率必须是非负数字。")
          : !Number.isInteger(form.name_rule) || form.name_rule < 0 || form.name_rule > 3
            ? t("Choose a valid name rule.", "请选择有效的名称匹配规则。")
            : !isValidEndpoints
              ? t("Endpoints must be valid JSON.", "接口配置必须是有效的 JSON。")
              : quotaTypes === null
                ? t("Quota types can only contain 0 or 1.", "额度类型只能填写 0 或 1。")
                : null;
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }
    setSaving(true);
    setError(null);
    setFormError(null);
    try {
      const isCreate = !editor;
      const payload = {
        ...form,
        model_name: modelName,
        vendor_id: vendorId,
        model_ratio: promptRatio,
        completion_ratio: completionRatio,
        endpoints,
        tags: splitList(form.tags).join(","),
        enable_groups: splitList(form.enable_groups),
        quota_types: quotaTypes ?? [],
      };
      await (editor ? api.updateModel({ ...payload, id: editor.id }) : api.createModel(payload));
      setEditor(undefined);
      const result = await api.models(page, search, {
        status: statusFilter || undefined,
        sync_official: syncFilter || undefined,
      });
      setModels(result.items ?? []);
      setTotal(result.total ?? 0);
      toast.success({
        message: isCreate
          ? t("Model created", "模型已创建")
          : t("Model updated", "模型已更新"),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to save model.", "无法保存模型。");
      setFormError(message);
      toast.error({ message });
    } finally {
      setSaving(false);
    }
  }

  async function runModelSync(action: "preview" | "missing" | "sync") {
    setSyncing(true);
    setError(null);
    try {
      const value =
        action === "preview"
          ? await api.previewModelSync()
          : action === "missing"
            ? await api.missingModels()
            : await api.syncUpstreamModels();
      setSyncPayload(value);
      if (action === "sync") {
        const result = await api.models(page, search, {
          status: statusFilter || undefined,
          sync_official: syncFilter || undefined,
        });
        setModels(result.items ?? []);
        setTotal(result.total ?? 0);
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("Unable to sync upstream models.", "无法同步上游模型。"),
      );
    } finally {
      setSyncing(false);
    }
  }
  async function showDetails(model: ApiModel) {
    try {
      setDetails(await api.modelDetails(model.id));
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load model details.", "无法加载模型详情。");
      setError(message);
      toast.error({ message });
    }
  }

  function exportModelCsv() {
    const columns: CsvColumn<ApiModel>[] = [
      { key: "model_name", header: "Model" },
      { key: "description", header: "Description" },
      { key: "icon", header: "Icon" },
      { key: "tags", header: "Tags" },
      {
        key: "model_ratio",
        header: "Model Ratio",
        format: (v) => String(v ?? 1),
      },
      {
        key: "completion_ratio",
        header: "Completion Ratio",
        format: (v) => String(v ?? 1),
      },
      {
        key: "status",
        header: "Status",
        format: (v) => (v === 1 ? "Active" : "Disabled"),
      },
      {
        key: "sync_official",
        header: "Sync",
        format: (v) => (v === 1 ? "Yes" : "No"),
      },
    ];
    downloadCsv("model-catalog.csv", models, columns);
    toast.success({
      message: t("CSV exported", "CSV 已导出"),
    });
  }

  function exportModelJson() {
    downloadJson("model-catalog.json", models);
    toast.success({
      message: t("JSON exported", "JSON 已导出"),
    });
  }

  async function importModelJson() {
    const file = await pickFile("application/json,.json");
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text) as ApiModel[];
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of model objects.");
      }
      let imported = 0;
      for (const record of parsed) {
        if (!record.model_name) continue;
        await api.createModel({
          model_name: record.model_name,
          description: record.description ?? "",
          icon: record.icon ?? "",
          tags: record.tags ?? "",
          vendor_id: record.vendor_id ?? 0,
          model_ratio: record.model_ratio ?? 1,
          completion_ratio: record.completion_ratio ?? 1,
          status: record.status ?? 1,
          sync_official: record.sync_official ?? 0,
          name_rule: record.name_rule ?? 0,
        });
        imported += 1;
      }
      const result = await api.models(page, search, {
        status: statusFilter || undefined,
        sync_official: syncFilter || undefined,
      });
      setModels(result.items ?? []);
      setTotal(result.total ?? 0);
      toast.success({
        message: t(
          `Imported ${imported} models`,
          `已导入 ${imported} 个模型`,
        ),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to import models.", "无法导入模型。");
      setError(message);
      toast.error({ message });
    }
  }

  const columns = [
    {
      key: "model_name",
      title: t("Model ID", "模型 ID"),
      render: (model: ApiModel) => (
        <ModelBadge name={model.model_name} />
      ),
    },
    {
      key: "model_ratio",
      title: t("Prompt ratio", "提示倍率"),
      render: (model: ApiModel) => (
        <span className="font-mono text-caption">
          {model.model_ratio ?? "-"}
        </span>
      ),
    },
    {
      key: "coverage",
      title: t("Coverage", "覆盖情况"),
      render: (model: ApiModel) => (
        <span className="text-caption text-muted">
          {model.matched_count ?? model.bound_channels?.length ?? 0} /{" "}
          {model.enable_groups?.length ?? 0}
        </span>
      ),
    },
    {
      key: "vendor_id",
      title: t("Vendor", "供应商"),
      render: (model: ApiModel) => (
        <span className="text-caption">{model.vendor_id || "-"}</span>
      ),
    },
    {
      key: "completion_ratio",
      title: t("Completion ratio", "补全倍率"),
      render: (model: ApiModel) => (
        <span className="font-mono text-caption">
          {model.completion_ratio ?? "-"}
        </span>
      ),
    },
    {
      key: "enabled",
      title: t("Status", "状态"),
      render: (model: ApiModel) => (
        <StatusBadge enabled={model.status !== 0} label={model.status === 0 ? t("Disabled", "已禁用") : t("Enabled", "已启用")} />
      ),
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (model: ApiModel) => (
        <div className="flex gap-3 text-muted">
          <button
            type="button"
            title={t("Details", "详情")}
            onClick={() => void showDetails(model)}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("Edit", "编辑")}
            onClick={() => openEditor(model)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("Delete", "删除")}
            onClick={() => void deleteModel(model)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title={modelSection === "deployments" ? t("Model Deployments", "模型部署") : t("Model Metadata", "模型元数据")}
      subtitle={t(
        "Manage model pricing and routing configuration.",
        "管理模型计费和路由配置。",
      )}
      isLoading={loading}
      error={error}
      onRetry={() => setPage(1)}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            title={t("Refresh", "刷新")}
            className="icon-btn h-9 w-9 rounded-md border border-ink/15"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <ActionMenu label={t("Model tools", "模型工具")} disabled={syncing} items={[
            { key: "preview", label: t("Preview sync", "预览同步"), icon: <RefreshCw className="h-4 w-4" />, onSelect: () => void runModelSync("preview") },
            { key: "missing", label: t("Missing models", "缺失模型"), icon: <Eye className="h-4 w-4" />, onSelect: () => void runModelSync("missing") },
            { key: "sync", label: t("Sync upstream", "同步上游"), icon: <RefreshCw className="h-4 w-4" />, onSelect: () => void runModelSync("sync") },
            { key: "import", label: t("Import JSON", "导入 JSON"), icon: <Upload className="h-4 w-4" />, onSelect: importModelJson },
            { key: "csv", label: t("Export CSV", "导出 CSV"), icon: <Download className="h-4 w-4" />, onSelect: exportModelCsv },
            { key: "json", label: t("Export JSON", "导出 JSON"), icon: <Download className="h-4 w-4" />, onSelect: exportModelJson },
          ]} />
          <button
            type="button"
            className="flex min-h-9 items-center gap-2 rounded-md bg-inverse px-4 text-caption font-medium text-paper"
            onClick={() => openEditor()}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("Add Model", "添加模型")}
          </button>
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={models}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder={t("Search models...", "搜索模型...")}
        filterNodes={
          <div className="flex flex-wrap gap-2">
            <SelectMenu value={statusFilter} ariaLabel={t("Filter status", "筛选状态")} onChange={(value) => { setPage(1); setStatusFilter(value); }} options={[{ value: "", label: t("All statuses", "全部状态") }, { value: "1", label: t("Enabled", "启用") }, { value: "0", label: t("Disabled", "禁用") }]} />
            <SelectMenu value={syncFilter} ariaLabel={t("Filter sync mode", "筛选同步模式")} onChange={(value) => { setPage(1); setSyncFilter(value); }} options={[{ value: "", label: t("All sync modes", "全部同步模式") }, { value: "1", label: t("Official sync", "官方同步") }, { value: "0", label: t("Manual", "手动维护") }]} />
          </div>
        }
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        batchActions={[
          {
            key: "sync-preview",
            label: batchWorking
              ? t("Working...", "处理中...")
              : t("Sync preview", "同步预览"),
            disabled: batchWorking,
            onClick: () => void runModelSync("preview"),
          },
          {
            key: "sync-apply",
            label: t("Apply sync", "应用同步"),
            disabled: batchWorking,
            onClick: () =>
              void runModelSync("sync").then(() => {
                setSelectedIds([]);
              }),
          },
          {
            key: "missing",
            label: t("Missing", "缺失模型"),
            disabled: batchWorking,
            onClick: () => void runModelSync("missing"),
          },
        ]}
      />
      {syncPayload !== null && (
        <pre className="mt-5 max-h-80 overflow-auto whitespace-pre-wrap break-all border border-[#121110]/10 bg-white p-4 font-mono text-caption">
          {JSON.stringify(syncPayload, null, 2)}
        </pre>
      )}
      {details && (
        <section className="mt-5 border border-[#121110]/10 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-lg">
              {t("Model details", "模型详情")}
            </h3>
            <button
              type="button"
              onClick={() => setDetails(null)}
              className="text-caption text-muted"
            >
              ×
            </button>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
            {JSON.stringify(details, null, 2)}
          </pre>
        </section>
      )}
      {editor !== undefined && (
        <div className="fixed inset-0 z-[200] flex justify-end bg-inverse/40" role="dialog" aria-modal="true" aria-labelledby="model-editor-title">
          <form
            onSubmit={saveModel}
            className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-ink/10 bg-primary shadow-drawer"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-ink/10 px-5 py-4 sm:px-6">
              <h2 id="model-editor-title" className="font-serif text-2xl">
                {editor
                  ? t("Edit Model", "编辑模型")
                  : t("Add Model", "添加模型")}
              </h2>
              <button
                type="button"
                onClick={() => setEditor(undefined)}
                className="text-sm"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            {formError && (
              <p role="alert" className="border-l-2 border-danger bg-red-50 px-3 py-2 text-caption text-danger">
                {formError}
              </p>
            )}
            <FormSection title={t("Identity", "基础信息")}>
            <label className="block space-y-1 text-micro font-mono uppercase">
              <span>{t("Model ID", "模型 ID")}</span>
              <input
                required
                value={form.model_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    model_name: event.target.value,
                  }))
                }
                className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
              />
            </label>
            <label className="block space-y-1 text-micro font-mono uppercase">
              <span>{t("Description", "描述")}</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="w-full border border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
              />
            </label>
            </FormSection>
            <FormSection title={t("Routing", "路由配置")}>
            <div className="grid gap-4 sm:grid-cols-3">
              {(["endpoints", "enable_groups", "quota_types"] as const).map((key) => (
                <label key={key} className="space-y-1 text-micro font-mono uppercase">
                  <span>{key === "endpoints" ? t("Endpoints", "接口类型") : key === "enable_groups" ? t("Available groups", "可用分组") : t("Quota types", "额度类型")}</span>
                  <input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={key === "quota_types" ? "0,1" : key === "endpoints" ? '{"chat":"/v1/chat/completions"}' : "default,premium"} className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none" />
                </label>
              ))}
            </div>
            </FormSection>
            <FormSection title={t("Pricing", "计费配置")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["icon", "Icon", "图标"],
                  ["tags", "Tags", "标签"],
                ] as const
              ).map(([key, en, zh]) => (
                <label
                  key={key}
                  className="space-y-1 text-micro font-mono uppercase"
                >
                  <span>{t(en, zh)}</span>
                  <input
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                  />
                </label>
              ))}
            </div>
            </FormSection>
            <FormSection title={t("Availability", "可用性")}>
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["vendor_id", "Vendor ID", "供应商 ID"],
                  ["model_ratio", "Prompt ratio", "提示倍率"],
                  ["completion_ratio", "Completion ratio", "补全倍率"],
                ] as const
              ).map(([key, en, zh]) => (
                <label
                  key={key}
                  className="space-y-1 text-micro font-mono uppercase"
                >
                  <span>{t(en, zh)}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }))
                    }
                    className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                  />
                </label>
              ))}
            </div>
            </FormSection>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1 text-micro font-mono uppercase">
                <span>{t("Name rule", "名称匹配规则")}</span>
                <SelectMenu value={String(form.name_rule)} onChange={(value) => setForm((current) => ({ ...current, name_rule: Number(value) }))} options={[{ value: "0", label: t("Exact", "精确") }, { value: "1", label: t("Prefix", "前缀") }, { value: "2", label: t("Contains", "包含") }, { value: "3", label: t("Suffix", "后缀") }]} />
              </label>
              <label className="space-y-1 text-micro font-mono uppercase">
                <span>{t("Status", "状态")}</span>
                <SelectMenu value={String(form.status)} onChange={(value) => setForm((current) => ({ ...current, status: Number(value) }))} options={[{ value: "1", label: t("Enabled", "启用") }, { value: "0", label: t("Disabled", "禁用") }]} />
              </label>
              <label className="space-y-1 text-micro font-mono uppercase">
                <span>{t("Official sync", "官方同步")}</span>
                <SelectMenu value={String(form.sync_official)} onChange={(value) => setForm((current) => ({ ...current, sync_official: Number(value) }))} options={[{ value: "1", label: t("Enabled", "开启") }, { value: "0", label: t("Manual", "手动") }]} />
              </label>
            </div>
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-ink/10 bg-primary/95 px-5 py-4 backdrop-blur sm:px-6">
              <button
                type="button"
                onClick={() => setEditor(undefined)}
                className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
              >
                {t("Cancel", "取消")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-inverse px-5 py-2 text-overline font-mono uppercase text-white"
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
