import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { SelectMenu } from "../../components/ui/SelectMenu";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type PlanForm = {
  title: string;
  price_amount: string;
  duration_value: string;
  duration_unit: "day" | "week" | "month" | "year";
  total_amount: string;
  sort_order: string;
  enabled: boolean;
  allow_balance_pay: boolean;
  allow_wallet_overflow: boolean;
  max_purchase_per_user: string;
  upgrade_group: string;
  downgrade_group: string;
  quota_reset_period: "never" | "daily" | "weekly" | "monthly" | "custom";
  quota_reset_custom_seconds: string;
};

const EMPTY_FORM: PlanForm = {
  title: "",
  price_amount: "0",
  duration_value: "1",
  duration_unit: "month",
  total_amount: "0",
  sort_order: "0",
  enabled: true,
  allow_balance_pay: true,
  allow_wallet_overflow: true,
  max_purchase_per_user: "0",
  upgrade_group: "",
  downgrade_group: "",
  quota_reset_period: "never",
  quota_reset_custom_seconds: "0",
};

const DURATION_UNITS: PlanForm["duration_unit"][] = [
  "day",
  "week",
  "month",
  "year",
];

function readNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readBool(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "true" || value === "1";
  return fallback;
}

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default function SubscriptionPlans() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [editor, setEditor] = useState<{
    open: boolean;
    id: number | null;
    form: PlanForm;
  }>({ open: false, id: null, form: EMPTY_FORM });
  const [pendingReset, setPendingReset] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.adminSubscriptionPlans();
      const list = Array.isArray(response)
        ? response
        : (((response as unknown as { plans?: unknown[] })?.plans as
            unknown[] | undefined) ?? []);
      setPlans(
        list.map(
          (item) => (item as { plan: Record<string, unknown> }).plan ?? item,
        ) as Array<Record<string, unknown>>,
      );
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load subscription plans.", "无法加载订阅计划。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () =>
    setEditor({ open: true, id: null, form: EMPTY_FORM });

  const openEdit = (plan: Record<string, unknown>) => {
    const id = readNumber(plan.id, 0);
    if (!id) {
      setError(t("This plan has no valid ID.", "该计划没有有效 ID。"));
      return;
    }
    setEditor({
      open: true,
      id,
      form: {
        title: String(plan.title ?? plan.name ?? ""),
        price_amount: String(plan.price_amount ?? plan.price ?? 0),
        duration_value: String(plan.duration_value ?? 1),
        duration_unit:
          DURATION_UNITS.find((u) => u === plan.duration_unit) ?? "month",
        total_amount: String(plan.total_amount ?? 0),
        sort_order: String(plan.sort_order ?? 0),
        enabled: readBool(plan.enabled, true),
        allow_balance_pay: readBool(plan.allow_balance_pay, true),
        allow_wallet_overflow: readBool(plan.allow_wallet_overflow, true),
        max_purchase_per_user: String(plan.max_purchase_per_user ?? 0),
        upgrade_group: String(plan.upgrade_group ?? ""),
        downgrade_group: String(plan.downgrade_group ?? ""),
        quota_reset_period:
          (["never", "daily", "weekly", "monthly", "custom"] as const).find(
            (period) => period === plan.quota_reset_period,
          ) ?? "never",
        quota_reset_custom_seconds: String(
          plan.quota_reset_custom_seconds ?? 0,
        ),
      },
    });
  };

  const closeEditor = () =>
    setEditor({ open: false, id: null, form: EMPTY_FORM });

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor.form.title.trim()) {
      setError(t("Plan title is required.", "请填写计划名称。"));
      return;
    }
    const body = {
      title: editor.form.title.trim(),
      price_amount: readNumber(editor.form.price_amount),
      duration_value: readNumber(editor.form.duration_value, 1),
      duration_unit: editor.form.duration_unit,
      total_amount: readNumber(editor.form.total_amount),
      sort_order: readNumber(editor.form.sort_order),
      enabled: editor.form.enabled,
      allow_balance_pay: editor.form.allow_balance_pay,
      allow_wallet_overflow: editor.form.allow_wallet_overflow,
      max_purchase_per_user: readNumber(editor.form.max_purchase_per_user),
      upgrade_group: editor.form.upgrade_group.trim(),
      downgrade_group: editor.form.downgrade_group.trim(),
      quota_reset_period: editor.form.quota_reset_period,
      quota_reset_custom_seconds: readNumber(
        editor.form.quota_reset_custom_seconds,
      ),
    };
    setWorking(true);
    setError(null);
    try {
      if (editor.id) {
        await api.updateSubscriptionPlan(editor.id, body);
      } else {
        await api.createSubscriptionPlan(body);
      }
      toast.success({ message: t("Saved", "已保存") });
      closeEditor();
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to save plan.", "无法保存计划。");
      setError(message);
      toast.error({ message });
    } finally {
      setWorking(false);
    }
  };

  const togglePlan = async (plan: Record<string, unknown>) => {
    const id = readNumber(plan.id);
    if (!id) return;
    setWorking(true);
    setError(null);
    try {
      await api.updateSubscriptionPlanStatus(id, !readBool(plan.enabled, true));
      toast.success({ message: t("Status updated", "状态已更新") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to update plan status.", "无法更新计划状态。");
      setError(message);
      toast.error({ message });
    } finally {
      setWorking(false);
    }
  };

  const resetPlan = async (plan: Record<string, unknown>) => {
    const id = readNumber(plan.id);
    if (!id) return;
    const ok = await confirm({
      title: t("Reset subscriptions", "重置订阅"),
      description: t(
        "Reset all subscriptions for this plan? Users will be charged again on the next reset time.",
        "重置该计划下的全部订阅？重置后下次扣费时间会提前。",
      ),
      confirmText: t("Reset", "重置"),
      variant: "danger",
    });
    if (!ok) return;
    setPendingReset(id);
    setError(null);
    try {
      await api.resetPlanSubscriptions(id, true);
      toast.success({ message: t("Subscriptions reset", "订阅已重置") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to reset plan subscriptions.", "无法重置计划订阅。");
      setError(message);
      toast.error({ message });
    } finally {
      setPendingReset(null);
    }
  };

  const columns = [
    {
      key: "title",
      title: t("Title", "计划名称"),
      render: (plan: Record<string, unknown>) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {String(plan.title ?? plan.name ?? "-")}
          </span>
          <span className="font-mono text-caption text-muted">
            #{String(plan.id ?? "-")}
          </span>
        </div>
      ),
    },
    {
      key: "price_amount",
      title: t("Price", "价格"),
      render: (plan: Record<string, unknown>) => (
        <span className="font-mono text-[12px]">
          {formatMoney(readNumber(plan.price_amount))}
        </span>
      ),
    },
    {
      key: "total_amount",
      title: t("Quota", "额度"),
      render: (plan: Record<string, unknown>) => (
        <span className="font-mono text-[12px]">
          {readNumber(plan.total_amount).toLocaleString()}
        </span>
      ),
    },
    {
      key: "duration",
      title: t("Duration", "周期"),
      render: (plan: Record<string, unknown>) => (
        <span className="text-[12px] text-muted">
          {readNumber(plan.duration_value, 1)}{" "}
          {String(plan.duration_unit ?? "month")}
        </span>
      ),
    },
    {
      key: "sort_order",
      title: t("Sort", "排序"),
      render: (plan: Record<string, unknown>) => (
        <span className="font-mono text-[12px]">
          {readNumber(plan.sort_order)}
        </span>
      ),
    },
    {
      key: "enabled",
      title: t("State", "状态"),
      render: (plan: Record<string, unknown>) => {
        const enabled = readBool(plan.enabled, true);
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-overline font-mono uppercase tracking-widest border ${
              enabled
                ? "border-[#121110] bg-inverse text-[#FAFAFA]"
                : "border-[#121110]/10 bg-white text-muted"
            }`}
          >
            {enabled ? (
              <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
            ) : (
              <XCircle className="h-3 w-3" strokeWidth={1.5} />
            )}
            {enabled ? t("Enabled", "已启用") : t("Disabled", "已停用")}
          </span>
        );
      },
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (plan: Record<string, unknown>) => (
        <div className="flex items-center gap-3 text-muted">
          <button
            type="button"
            title={t("Edit", "编辑")}
            onClick={() => openEdit(plan)}
            className="hover:text-[#121110]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("Reset subscriptions", "重置订阅")}
            onClick={() => void resetPlan(plan)}
            disabled={working || pendingReset === readNumber(plan.id)}
            className="hover:text-[#121110] disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={
              readBool(plan.enabled, true)
                ? t("Disable", "停用")
                : t("Enable", "启用")
            }
            onClick={() => void togglePlan(plan)}
            disabled={working}
            className="hover:text-[#121110] disabled:opacity-40"
          >
            {readBool(plan.enabled, true) ? (
              <XCircle className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title={t("Subscription Plans", "订阅计划")}
      subtitle={t(
        "Author subscription tiers, durations, quotas, and reset cadence.",
        "管理订阅档位、周期、额度和重置节奏。",
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
            onClick={openCreate}
            className="flex items-center gap-2 bg-inverse text-[#FAFAFA] px-5 py-2 text-overline font-mono uppercase tracking-widest"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("New plan", "新建计划")}
          </button>
        </>
      }
    >
      <DataTable
        columns={columns}
        data={plans}
        total={plans.length}
        page={1}
        pageSize={Math.max(plans.length, 10)}
        onPageChange={() => {
          /* no pagination yet, backend returns all plans */
        }}
      />

      {editor.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-inverse/40 p-6">
          <form
            onSubmit={(event) => void savePlan(event)}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-xl space-y-5 overflow-y-auto border border-[#121110]/10 bg-primary p-5 shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">
                {editor.id
                  ? t("Edit plan", "编辑计划")
                  : t("New plan", "新建计划")}
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
                <span>{t("Title", "计划名称")}</span>
                <input
                  required
                  value={editor.form.title}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      form: { ...current.form, title: event.target.value },
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Price", "价格")}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editor.form.price_amount}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      form: {
                        ...current.form,
                        price_amount: event.target.value,
                      },
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Quota", "额度")}</span>
                <input
                  type="number"
                  min="0"
                  value={editor.form.total_amount}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      form: {
                        ...current.form,
                        total_amount: event.target.value,
                      },
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Duration value", "周期数量")}</span>
                <input
                  type="number"
                  min="1"
                  value={editor.form.duration_value}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      form: {
                        ...current.form,
                        duration_value: event.target.value,
                      },
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Unit", "单位")}</span>
                <SelectMenu value={editor.form.duration_unit} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, duration_unit: value as PlanForm["duration_unit"] } }))} options={DURATION_UNITS.map((unit) => ({ value: unit, label: unit }))} />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Sort order", "排序")}</span>
                <input
                  type="number"
                  value={editor.form.sort_order}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      form: { ...current.form, sort_order: event.target.value },
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-[12px] sm:col-span-2">
                <input
                  type="checkbox"
                  checked={editor.form.enabled}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      form: { ...current.form, enabled: event.target.checked },
                    }))
                  }
                />
                {t("Enabled for purchase", "允许购买")}
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Max purchases per user", "每用户购买上限")}</span>
                <input
                  type="number"
                  min="0"
                  value={editor.form.max_purchase_per_user}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      form: {
                        ...current.form,
                        max_purchase_per_user: event.target.value,
                      },
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Quota reset", "额度重置")}</span>
                <SelectMenu value={editor.form.quota_reset_period} onChange={(value) => setEditor((current) => ({ ...current, form: { ...current.form, quota_reset_period: value as PlanForm["quota_reset_period"] } }))} options={["never", "daily", "weekly", "monthly", "custom"].map((period) => ({ value: period, label: period }))} />
              </label>
              {editor.form.quota_reset_period === "custom" && (
                <label className="space-y-1 text-overline font-mono uppercase">
                  <span>{t("Custom reset seconds", "自定义重置秒数")}</span>
                  <input
                    type="number"
                    min="1"
                    value={editor.form.quota_reset_custom_seconds}
                    onChange={(event) =>
                      setEditor((current) => ({
                        ...current,
                        form: {
                          ...current.form,
                          quota_reset_custom_seconds: event.target.value,
                        },
                      }))
                    }
                    className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                  />
                </label>
              )}
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Upgrade group", "升级分组")}</span>
                <input
                  value={editor.form.upgrade_group}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      form: {
                        ...current.form,
                        upgrade_group: event.target.value,
                      },
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Downgrade group", "降级分组")}</span>
                <input
                  value={editor.form.downgrade_group}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      form: {
                        ...current.form,
                        downgrade_group: event.target.value,
                      },
                    }))
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={editor.form.allow_balance_pay}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      form: {
                        ...current.form,
                        allow_balance_pay: event.target.checked,
                      },
                    }))
                  }
                />
                {t("Allow balance payment", "允许余额支付")}
              </label>
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={editor.form.allow_wallet_overflow}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      form: {
                        ...current.form,
                        allow_wallet_overflow: event.target.checked,
                      },
                    }))
                  }
                />
                {t("Allow wallet overflow", "允许钱包余额补充")}
              </label>
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
                disabled={working}
                className="bg-inverse px-5 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
              >
                {working ? t("Saving...", "保存中...") : t("Save", "保存")}
              </button>
            </div>
          </form>
        </div>
      )}
    </PageContainer>
  );
}
