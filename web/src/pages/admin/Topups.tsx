import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Filter, RefreshCw, Search, X } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { SelectMenu } from "../../components/ui/SelectMenu";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type Topup = Record<string, unknown> & {
  id?: number;
  trade_no?: string;
  user_id?: number;
  amount?: number;
  money?: number;
  payment_method?: string;
  payment_provider?: string;
  status?: string;
  create_time?: number;
  complete_time?: number;
};

const PAGE_SIZE = 15;

function readNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatTime(value: unknown) {
  const n = readNumber(value);
  if (n <= 0) return "-";
  return n > 1e12
    ? new Date(n).toLocaleString()
    : new Date(n * 1000).toLocaleString();
}

function formatMoney(value: unknown) {
  return readNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  });
}

function statusVariant(status: string | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "success" || s === "completed" || s === "paid") {
    return {
      className: "border-[#121110] bg-inverse text-[#FAFAFA]",
      label: "Success",
    };
  }
  if (s === "pending" || s === "waiting") {
    return {
      className: "border-yellow-600 bg-yellow-50 text-yellow-700",
      label: "Pending",
    };
  }
  if (s === "failed" || s === "error" || s === "cancelled") {
    return {
      className: "border-red-700 bg-red-50 text-red-700",
      label: "Failed",
    };
  }
  return {
    className: "border-[#121110]/20 bg-white text-muted",
    label: status || "Unknown",
  };
}

function exportCsv(rows: Topup[]): string {
  const headers = [
    "id",
    "trade_no",
    "user_id",
    "amount",
    "money",
    "payment_method",
    "payment_provider",
    "status",
    "create_time",
    "complete_time",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id ?? "",
        row.trade_no ?? "",
        row.user_id ?? "",
        row.amount ?? "",
        readNumber(row.money),
        row.payment_method ?? "",
        row.payment_provider ?? "",
        row.status ?? "",
        formatTime(row.create_time),
        formatTime(row.complete_time),
      ]
        .map((field) => {
          const text = String(field).replace(/"/g, '""');
          return /[",\n]/.test(text) ? `"${text}"` : text;
        })
        .join(","),
    );
  }
  return lines.join("\n");
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function Topups() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [items, setItems] = useState<Topup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    kind: "ok" | "warn";
    text: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pageData = await api.adminTopups(page, keyword.trim() || undefined);
      setItems(
        Array.isArray(pageData.items) ? (pageData.items as Topup[]) : [],
      );
      setTotal(pageData.total ?? 0);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load topups.", "无法加载充值订单。");
      setError(message);
      toast.error({ message });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const visibleItems = useMemo(() => {
    if (!statusFilter) return items;
    const wanted = statusFilter.toLowerCase();
    return items.filter((item) => (item.status ?? "").toLowerCase() === wanted);
  }, [items, statusFilter]);

  async function completeOne(item: Topup) {
    const tradeNo = item.trade_no?.trim();
    if (!tradeNo) return;
    const ok = await confirm({
      title: t("Complete order", "补单"),
      description: t(
        `Complete order "${tradeNo}" manually?`,
        `确定手动完成订单 "${tradeNo}"？`,
      ),
      confirmText: t("Complete", "补单"),
      variant: "danger",
    });
    if (!ok) return;
    setWorking(true);
    setError(null);
    setBanner(null);
    try {
      await api.completeTopup(tradeNo);
      setBanner({
        kind: "ok",
        text: t("Order completed.", "订单已补单完成。"),
      });
      toast.success({ message: t("Order completed", "订单已补单") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to complete order.", "订单补单失败。");
      setError(message);
      toast.error({ message });
    } finally {
      setWorking(false);
    }
  }

  async function completeSelected() {
    const trades = new Set<string>();
    for (const id of selectedIds) {
      const item = items.find((row) => String(row.id) === String(id));
      const trade = item?.trade_no?.trim();
      if (trade) trades.add(trade);
    }
    if (trades.size === 0) {
      const message = t(
        "Select rows that have trade numbers.",
        "请选择带有交易号的行。",
      );
      setError(message);
      toast.error({ message });
      return;
    }
    const ok = await confirm({
      title: t("Complete orders", "补单"),
      description: t(
        `Complete ${trades.size} orders manually?`,
        `手动完成 ${trades.size} 个订单？`,
      ),
      confirmText: t("Complete", "补单"),
      variant: "danger",
    });
    if (!ok) return;
    setWorking(true);
    setError(null);
    setBanner(null);
    let done = 0;
    let failed = 0;
    try {
      for (const trade of trades) {
        try {
          await api.completeTopup(trade);
          done += 1;
        } catch {
          failed += 1;
        }
      }
      setBanner({
        kind: failed === 0 ? "ok" : "warn",
        text: t(
          `Completed ${done} orders, ${failed} failed.`,
          `补单 ${done} 个，失败 ${failed} 个。`,
        ),
      });
      if (failed === 0) {
        toast.success({ message: t("Orders completed", "订单已补单") });
      } else {
        toast.error({
          message: t(
            `Completed ${done}, ${failed} failed`,
            `补单 ${done} 个，失败 ${failed} 个`,
          ),
        });
      }
      setSelectedIds([]);
      await load();
    } finally {
      setWorking(false);
    }
  }

  async function reconcile(dryRun: boolean) {
    setError(null);
    setBanner(null);
    try {
      const report = await api.reconcileEpay(dryRun);
      const text =
        typeof report === "string" ? report : JSON.stringify(report, null, 2);
      setBanner({ kind: "ok", text });
      toast.success({
        message: dryRun
          ? t("Reconcile preview", "对账预览完成")
          : t("Reconcile completed", "对账完成"),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Reconciliation failed.", "对账失败。");
      setError(message);
      toast.error({ message });
    }
  }

  function exportFiltered() {
    const csv = exportCsv(visibleItems);
    downloadFile(
      `topups-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv;charset=utf-8",
    );
  }

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const status = item.status;
      if (status) set.add(status);
    }
    return Array.from(set).sort();
  }, [items]);

  const columns = [
    {
      key: "trade_no",
      title: t("Trade no.", "订单号"),
      render: (item: Topup) => (
        <span className="font-mono text-[12px]">
          {String(item.trade_no ?? "-")}
        </span>
      ),
    },
    {
      key: "user_id",
      title: t("User", "用户"),
      render: (item: Topup) => (
        <span className="font-mono text-[12px] text-muted">
          {String(item.user_id ?? "-")}
        </span>
      ),
    },
    {
      key: "money",
      title: t("Amount", "金额"),
      render: (item: Topup) => (
        <span className="font-mono text-[12px]">{formatMoney(item.money)}</span>
      ),
    },
    {
      key: "amount",
      title: t("Quota", "额度"),
      render: (item: Topup) => (
        <span className="font-mono text-[12px] text-muted">
          {item.amount === undefined ? "-" : item.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "payment_method",
      title: t("Method", "方式"),
      render: (item: Topup) => (
        <span className="text-[12px] text-muted">
          {String(item.payment_method ?? item.payment_provider ?? "-")}
        </span>
      ),
    },
    {
      key: "payment_provider",
      title: t("Provider", "支付提供商"),
      render: (item: Topup) => (
        <span className="text-[12px] text-muted">
          {String(item.payment_provider ?? "-")}
        </span>
      ),
    },
    {
      key: "status",
      title: t("Status", "状态"),
      render: (item: Topup) => {
        const variant = statusVariant(item.status);
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-overline font-mono uppercase tracking-widest border ${variant.className}`}
          >
            {variant.label}
          </span>
        );
      },
    },
    {
      key: "create_time",
      title: t("Created", "创建时间"),
      render: (item: Topup) => (
        <span className="font-mono text-caption text-muted">
          {formatTime(item.create_time)}
        </span>
      ),
    },
    {
      key: "complete_time",
      title: t("Completed", "完成时间"),
      render: (item: Topup) => (
        <span className="font-mono text-caption text-muted">
          {formatTime(item.complete_time)}
        </span>
      ),
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (item: Topup) => {
        const isClosed =
          (item.status ?? "").toLowerCase() === "success" ||
          (item.status ?? "").toLowerCase() === "completed" ||
          (item.status ?? "").toLowerCase() === "paid";
        return (
          <button
            type="button"
            disabled={isClosed || working}
            onClick={() => void completeOne(item)}
            className="text-overline font-mono uppercase tracking-widest text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("Complete", "补单")}
          </button>
        );
      },
    },
  ];

  const batchActions = [
    {
      key: "complete-selected",
      label: working
        ? t("Working...", "处理中...")
        : t("Complete selected", "补单所选"),
      disabled: working || selectedIds.length === 0,
      onClick: () => void completeSelected(),
    },
    {
      key: "export",
      label: t("Export CSV", "导出 CSV"),
      onClick: exportFiltered,
    },
  ];

  return (
    <PageContainer
      title={t("Top-up Orders", "充值订单")}
      subtitle={t(
        "Review payment records, reconcile pending EPay orders, and export to CSV.",
        "查看充值记录、对账待处理 EPay 订单并导出 CSV。",
      )}
      isLoading={loading}
      error={error}
      onRetry={load}
      actions={[
        {
          label: t("Refresh", "刷新"),
          icon: <RefreshCw className="h-3.5 w-3.5" />,
          onClick: () => void load(),
          disabled: loading,
        },
        {
          label: t("Dry-run", "对账预览"),
          icon: <Download className="h-3.5 w-3.5" />,
          onClick: () => void reconcile(true),
          disabled: loading,
        },
        {
          label: t("Reconcile", "对账执行"),
          icon: <Download className="h-3.5 w-3.5" />,
          onClick: () => void reconcile(false),
          disabled: loading,
        },
        {
          label: t("Export", "导出"),
          icon: <Download className="h-3.5 w-3.5" />,
          onClick: exportFiltered,
          disabled: visibleItems.length === 0,
        },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex min-w-64 items-center gap-2 border-b border-[#121110]/20 px-2 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t("Trade no. or user", "订单号或用户")}
            className="w-full bg-transparent text-[12px] outline-none"
          />
        </label>
        <label className="flex items-center gap-2 border-b border-[#121110]/20 px-2 py-2">
          <Filter className="h-3.5 w-3.5 text-muted" />
          <SelectMenu value={statusFilter} onChange={setStatusFilter} options={[{ value: "", label: t("All statuses", "所有状态") }, ...statusOptions.map((status) => ({ value: status, label: status }))]} />
          {statusFilter && (
            <button
              type="button"
              onClick={() => setStatusFilter("")}
              className="text-muted hover:text-[#121110]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </label>
      </div>

      {banner && (
        <pre
          className={`mb-5 max-h-56 overflow-auto whitespace-pre-wrap break-all border p-3 font-mono text-[12px] ${
            banner.kind === "ok"
              ? "border-green-700 bg-green-50 text-green-800"
              : "border-yellow-700 bg-yellow-50 text-yellow-800"
          }`}
        >
          {banner.text}
        </pre>
      )}

      <DataTable
        columns={columns}
        data={visibleItems}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(value) => {
          setPage(1);
          setKeyword(value);
        }}
        searchPlaceholder={t(
          "Search by trade no. or user",
          "按订单号或用户搜索",
        )}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        batchActions={batchActions}
      />
    </PageContainer>
  );
}
