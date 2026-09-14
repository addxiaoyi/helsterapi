import { useLang } from "../../lib/LanguageContext";
import React, { useCallback, useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { Plus, Pencil, Trash2, Power, PowerOff, Eye } from "lucide-react";
import { api, type ApiVendor } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type VendorRow = ApiVendor & {
  latency: string;
  spend: string;
};

export default function Vendors() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // create
  const [createOpen, setCreateOpen] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [creating, setCreating] = useState(false);

  // edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // delete
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [details, setDetails] = useState<ApiVendor | null>(null);

  const loadVendors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.vendors(page, search.trim() || undefined);
      setVendors(response.items);
      setTotal(response.total);
    } catch (cause) {
      setVendors([]);
      setTotal(0);
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load vendors.", "无法加载供应商。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, t, toast]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  async function showDetails(id: number) {
    try {
      setDetails(await api.vendorDetails(id));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load vendor details.", "无法加载供应商详情。");
      setError(message);
      toast.error({ message });
    }
  }

  // create
  async function createVendor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vendorName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.addVendor(vendorName.trim());
      toast.success({ message: t("Created", "已创建") });
      setVendorName("");
      setCreateOpen(false);
      setPage(1);
      await loadVendors();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to create vendor.", "无法创建供应商。");
      setError(message);
      toast.error({ message });
    } finally {
      setCreating(false);
    }
  }

  // edit
  function openEdit(v: ApiVendor) {
    setEditId(v.id);
    setEditName(v.name);
    setError(null);
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editId || !editName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateVendor(editId, { name: editName.trim() });
      toast.success({ message: t("Saved", "已保存") });
      setEditId(null);
      setEditName("");
      await loadVendors();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to update vendor.", "无法更新供应商。");
      setError(message);
      toast.error({ message });
    } finally {
      setSaving(false);
    }
  }

  // delete
  function openDelete(id: number) {
    setDeleteId(id);
    setError(null);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteVendor(deleteId);
      toast.success({ message: t("Deleted", "已删除") });
      setDeleteId(null);
      await loadVendors();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to delete vendor.", "无法删除供应商。");
      setError(message);
      toast.error({ message });
    } finally {
      setDeleting(false);
    }
  }

  // toggle enable
  async function toggleEnable(v: ApiVendor) {
    const newStatus = v.status === 1 ? 0 : 1;
    try {
      await api.updateVendor(v.id, { name: v.name, status: newStatus });
      await loadVendors();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to update vendor status.", "无法更新供应商状态。");
      setError(message);
      toast.error({ message });
    }
  }

  const filtered: VendorRow[] = vendors.map((v) => ({
    ...v,
    latency: "-",
    spend: "-",
  }));

  const columns = [
    {
      key: "name",
      title: t("Provider", "供应商"),
      render: (r: VendorRow) => (
        <span className="font-mono text-caption">{r.name}</span>
      ),
    },
    {
      key: "latency",
      title: t("Avg Latency", "平均延迟"),
      render: () => (
        <span className="font-mono text-caption text-muted">—</span>
      ),
    },
    {
      key: "spend",
      title: t("Monthly Spend", "本月支出"),
      render: () => <span className="font-mono text-caption">—</span>,
    },
    {
      key: "status",
      title: t("System Status", "系统状态"),
      render: (r: VendorRow) => {
        const label =
          r.status === 1
            ? "Operational"
            : r.status === 0
              ? "Offline"
              : "Degraded";
        const cn =
          label === "Operational"
            ? "text-[#121110]"
            : label === "Degraded"
              ? "text-yellow-600"
              : "text-red-600";
        const zh =
          label === "Operational"
            ? "运行中"
            : label === "Degraded"
              ? "降级"
              : "离线";
        return (
          <span
            className={`text-overline font-mono uppercase tracking-widest ${cn}`}
          >
            {t(label, zh)}
          </span>
        );
      },
    },
    {
      key: "actions",
      title: "",
      render: (r: VendorRow) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => void showDetails(r.id)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted hover:text-[#121110] transition-colors"
            title={t("Details", "详情")}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => openEdit(r)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted hover:text-[#121110] transition-colors"
            title={t("Edit", "编辑")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => openDelete(r.id)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted hover:text-red-600 transition-colors"
            title={t("Delete", "删除")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => toggleEnable(r)}
            className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
              r.status === 1
                ? "text-[#121110] hover:text-red-600"
                : "text-muted hover:text-green-600"
            }`}
            title={r.status === 1 ? t("Disable", "禁用") : t("Enable", "启用")}
          >
            {r.status === 1 ? (
              <PowerOff className="h-3.5 w-3.5" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title={t("Upstream Vendors", "上游供应商")}
      subtitle={t(
        "Monitor third-party AI provider health, latencies, and billing.",
        "监控第三方 AI 供应商的健康状况、延迟和计费。",
      )}
      actions={
        <button
          onClick={() => {
            setVendorName("");
            setError(null);
            setCreateOpen(true);
          }}
          className="flex items-center gap-3 bg-inverse text-[#FAFAFA] px-6 py-2.5 text-overline font-mono uppercase tracking-widest"
        >
          <Plus className="h-3.5 w-3.5" />
          Integrate Provider
        </button>
      }
      isLoading={isLoading}
      error={error}
      onRetry={loadVendors}
    >
      <DataTable
        columns={columns}
        data={filtered}
        total={total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        onSearch={setSearch}
        searchPlaceholder={t("Locate provider...", "定位供应商...")}
      />
      {details && (
        <section className="mt-5 border border-[#121110]/10 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-lg">
              {t("Provider details", "供应商详情")}
            </h3>
            <button
              type="button"
              onClick={() => setDetails(null)}
              className="text-caption text-muted"
            >
              ×
            </button>
          </div>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
            {JSON.stringify(details, null, 2)}
          </pre>
        </section>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-inverse/40 p-6">
          <form
            onSubmit={createVendor}
            className="w-full max-w-md space-y-5 border border-[#121110]/10 bg-primary p-8 shadow-xl"
          >
            <h2 className="font-serif text-2xl">
              {t("Integrate Provider", "接入供应商")}
            </h2>
            <label className="block space-y-2 text-overline font-mono uppercase tracking-widest">
              <span>{t("Provider name", "供应商名称")}</span>
              <input
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                placeholder={t(
                  "e.g. OpenAI, Anthropic...",
                  "例如：OpenAI、Anthropic...",
                )}
                autoFocus
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
              >
                {t("Cancel", "取消")}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="bg-inverse px-5 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
              >
                {creating ? t("Creating...", "创建中...") : t("Create", "创建")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit modal */}
      {editId !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-inverse/40 p-6">
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md space-y-5 border border-[#121110]/10 bg-primary p-8 shadow-xl"
          >
            <h2 className="font-serif text-2xl">
              {t("Edit Provider", "编辑供应商")}
            </h2>
            <label className="block space-y-2 text-overline font-mono uppercase tracking-widest">
              <span>{t("Provider name", "供应商名称")}</span>
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                autoFocus
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditId(null)}
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

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-inverse/40 p-6">
          <div className="w-full max-w-sm space-y-5 border border-[#121110]/10 bg-primary p-8 shadow-xl">
            <h2 className="font-serif text-2xl">
              {t("Delete Provider", "删除供应商")}
            </h2>
            <p className="text-sm text-muted">
              {t(
                "This action cannot be undone. Are you sure?",
                "此操作无法撤销，确定要继续吗？",
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
              >
                {t("Cancel", "取消")}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-red-600 px-5 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
              >
                {deleting ? t("Deleting...", "删除中...") : t("Delete", "删除")}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
