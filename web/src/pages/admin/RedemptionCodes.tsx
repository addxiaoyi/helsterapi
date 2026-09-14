import { useLang } from "../../lib/LanguageContext";
import { SelectMenu } from "../../components/ui/SelectMenu";
import React, { useCallback, useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { Ticket, Copy, Trash2 } from "lucide-react";
import { api, type ApiRedemption } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type RedemptionRow = ApiRedemption & {
  hash: string;
  value: string;
  uses: string;
  created: string;
  expires: string;
  redeemed: string;
  statusLabel: "Active" | "Disabled" | "Redeemed" | "Expired";
};

function formatCodeTime(value: number) {
  return value > 0 ? new Date(value * 1000).toLocaleString() : "-";
}

function readNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeCode(value: Record<string, unknown>): ApiRedemption {
  return {
    id: readNumber(value.id),
    key: typeof value.key === "string" ? value.key : "",
    status: readNumber(value.status),
    name: typeof value.name === "string" ? value.name : "",
    quota: readNumber(value.quota),
    created_time: readNumber(value.created_time),
    redeemed_time: readNumber(value.redeemed_time),
    expired_time: readNumber(value.expired_time),
    used_user_id: readNumber(value.used_user_id),
  };
}

export default function RedemptionCodes() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [codes, setCodes] = useState<ApiRedemption[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issue, setIssue] = useState({ name: "", quota: 0, count: 1 });
  const [issuing, setIssuing] = useState(false);
  const loadCodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.redemptions(
        page,
        search.trim() || undefined,
        statusFilter || undefined,
      );
      const items = Array.isArray(response.items)
        ? response.items
            .filter(
              (item): item is ApiRedemption =>
                typeof item === "object" && item !== null,
            )
            .map(normalizeCode)
        : [];
      setCodes(items);
      setTotal(readNumber(response.total));
    } catch (cause) {
      setCodes([]);
      setTotal(0);
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load redemption codes.", "无法加载兑换码。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, t, toast]);
  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);
  async function deleteCode(code: ApiRedemption) {
    const ok = await confirm({
      title: t("Delete code", "删除兑换码"),
      description: t(
        "Delete this redemption code? This cannot be undone.",
        "确定删除此兑换码？此操作不可恢复。",
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteRedemption(code.id);
      toast.success({ message: t("Deleted", "已删除") });
      await loadCodes();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to delete redemption code.", "无法删除兑换码。");
      setError(message);
      toast.error({ message });
    }
  }
  async function deleteInvalidCodes() {
    const ok = await confirm({
      title: t("Delete invalid codes", "删除无效兑换码"),
      description: t(
        "Delete all invalid or exhausted redemption codes? This cannot be undone.",
        "确定删除所有无效或已耗尽兑换码？此操作不可恢复。",
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteInvalidRedemptions();
      toast.success({
        message: t("Invalid codes deleted", "无效兑换码已删除"),
      });
      await loadCodes();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to delete invalid codes.", "无法删除无效兑换码。");
      setError(message);
      toast.error({ message });
    }
  }

  async function issueCodes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIssuing(true);
    setError(null);
    try {
      await api.createRedemptions(issue);
      toast.success({ message: t("Issued", "已发行") });
      setIssueOpen(false);
      await loadCodes();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to issue redemption codes.", "无法发行兑换码。");
      setError(message);
      toast.error({ message });
    } finally {
      setIssuing(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success({ message: t("Copied", "已复制") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to copy code.", "无法复制兑换码。");
      setError(message);
      toast.error({ message });
    }
  }
  const filtered: RedemptionRow[] = codes.map((code) => ({
    ...code,
    hash: code.key,
    value: code.quota.toLocaleString(),
    uses: code.status === 1 ? "0" : "1",
    created: formatCodeTime(code.created_time),
    expires:
      code.expired_time > 0
        ? formatCodeTime(code.expired_time)
        : t("Never", "永不过期"),
    redeemed: formatCodeTime(code.redeemed_time),
    statusLabel:
      code.status === 1 &&
      code.expired_time > 0 &&
      code.expired_time < Date.now() / 1000
        ? "Expired"
        : code.status === 1
          ? "Active"
          : code.status === 2
            ? "Disabled"
            : "Redeemed",
  }));
  const columns = [
    {
      key: "hash",
      title: t("Cryptographic Hash", "兑换码 Hash"),
      render: (r: RedemptionRow) => (
        <div className="flex items-center gap-2">
          {" "}
          <span className="font-mono text-caption font-bold text-[#121110]">
            {r.hash}
          </span>{" "}
          <button
            onClick={() => void copyCode(r.hash)}
            className="text-muted hover:text-[#121110] transition-colors"
            title={t("Copy", "复制")}
          >
            <Copy className="w-3 h-3" />
          </button>{" "}
        </div>
      ),
    },
    {
      key: "value",
      title: t("Nominal Value", "面值额度"),
      render: (r: RedemptionRow) => (
        <span className="font-mono text-caption text-muted">{r.value}</span>
      ),
    },
    {
      key: "name",
      title: t("Batch", "批次"),
      render: (r: RedemptionRow) => (
        <span className="text-caption text-muted">{r.name || "-"}</span>
      ),
    },
    {
      key: "uses",
      title: t("Redemptions", "兑换次数"),
      render: (r: RedemptionRow) => (
        <span className="font-mono text-caption">{r.uses}</span>
      ),
    },
    {
      key: "created",
      title: t("Mint Date", "生成时间"),
      render: (r: RedemptionRow) => (
        <span className="font-mono text-caption">{r.created}</span>
      ),
    },
    {
      key: "expires",
      title: t("Expires", "过期时间"),
      render: (r: RedemptionRow) => (
        <span className="font-mono text-caption">{r.expires}</span>
      ),
    },
    {
      key: "redeemed",
      title: t("Redeemed", "兑换时间"),
      render: (r: RedemptionRow) => (
        <span className="font-mono text-caption">{r.redeemed}</span>
      ),
    },
    {
      key: "status",
      title: t("State", "状态"),
      render: (r: RedemptionRow) => (
        <span
          className={`text-overline font-mono uppercase tracking-widest ${r.statusLabel === "Active" ? "text-[#121110]" : "text-muted line-through"}`}
        >
          {" "}
          {t(
            r.statusLabel,
            r.statusLabel === "Active"
              ? "未使用"
              : r.statusLabel === "Expired"
                ? "已过期"
                : r.statusLabel === "Disabled"
                  ? "已禁用"
                  : "已兑换",
          )}{" "}
        </span>
      ),
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (r: RedemptionRow) => (
        <div className="flex items-center gap-3">
          {" "}
          <button
            onClick={() => void deleteCode(r as ApiRedemption)}
            className="text-muted hover:text-red-600 transition-colors"
            title={t("Delete", "删除")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>{" "}
        </div>
      ),
    },
  ];
  return (
    <PageContainer
      title={t("Redemption Center", "兑换码中心")}
      subtitle={t(
        "Generate and audit cryptographic vouchers for balance top-ups.",
        "生成并审计用于余额充值的加密凭证。",
      )}
      actions={
        <>
          <button
            onClick={() => void deleteInvalidCodes()}
            className="flex items-center gap-3 border border-red-700/30 px-4 py-2.5 text-overline font-mono uppercase tracking-widest text-red-700 hover:bg-red-50 transition-all duration-300 rounded-none"
          >
            <Trash2 className="w-3.5 h-3.5" /> {t("Clear invalid", "清理无效")}
          </button>
          <button
            onClick={() => setIssueOpen(true)}
            className="flex items-center gap-3 bg-inverse text-[#FAFAFA] px-6 py-2.5 text-overline font-mono uppercase tracking-widest hover:bg-black transition-all duration-300 active:scale-[0.98] ease-out-expo rounded-none"
          >
            <Ticket className="w-3.5 h-3.5" /> {t("Issue Batch", "批量发行")}
          </button>
        </>
      }
      isLoading={isLoading}
      error={error}
      onRetry={loadCodes}
    >
      {" "}
      <div className="space-y-3">
        <div className="flex justify-end">
          <label className="flex items-center gap-2 text-overline font-mono uppercase text-muted">
            <span>{t("Status", "状态")}</span>
            <SelectMenu value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }} options={[{ value: "", label: t("All", "全部") }, { value: "1", label: t("Active", "未使用") }, { value: "2", label: t("Disabled", "已禁用") }, { value: "3", label: t("Redeemed", "已兑换") }, { value: "expired", label: t("Expired", "已过期") }]} />
          </label>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          total={total}
          page={page}
          pageSize={10}
          onPageChange={setPage}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder={t(
            "Search by hash fragment...",
            "搜索兑换码片段...",
          )}
        />
      </div>{" "}
      {issueOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-inverse/40 p-6">
          <form
            onSubmit={issueCodes}
            className="w-full max-w-md space-y-5 border border-[#121110]/10 bg-primary p-8 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">
                {t("Issue Codes", "发行兑换码")}
              </h2>
              <button
                type="button"
                onClick={() => setIssueOpen(false)}
                className="text-sm"
              >
                ×
              </button>
            </div>
            <label className="block space-y-1 text-micro font-mono uppercase">
              <span>{t("Batch name", "批次名称")}</span>
              <input
                required
                value={issue.name}
                onChange={(event) =>
                  setIssue((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-micro font-mono uppercase">
                <span>{t("Quota", "额度")}</span>
                <input
                  required
                  type="number"
                  min="1"
                  value={issue.quota}
                  onChange={(event) =>
                    setIssue((current) => ({
                      ...current,
                      quota: Number(event.target.value),
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="space-y-1 text-micro font-mono uppercase">
                <span>{t("Count", "数量")}</span>
                <input
                  required
                  type="number"
                  min="1"
                  value={issue.count}
                  onChange={(event) =>
                    setIssue((current) => ({
                      ...current,
                      count: Number(event.target.value),
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIssueOpen(false)}
                className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
              >
                {t("Cancel", "取消")}
              </button>
              <button
                type="submit"
                disabled={issuing}
                className="bg-inverse px-5 py-2 text-overline font-mono uppercase text-white"
              >
                {issuing ? t("Issuing...", "发行中...") : t("Issue", "发行")}
              </button>
            </div>
          </form>
        </div>
      )}
    </PageContainer>
  );
}
