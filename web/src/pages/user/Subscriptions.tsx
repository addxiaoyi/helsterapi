import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useApp } from "../../lib/AppContext";
import { openPaymentComplianceGate } from "../../components/layout/PaymentComplianceGate";
import { SelectMenu } from "../../components/ui/SelectMenu";

type Plan = {
  id: number;
  title?: string;
  name?: string;
  price_amount?: number;
  price?: number;
  currency?: string;
  duration_value?: number;
  duration_unit?: string;
  billing_cycle?: string;
  description?: string;
  features?: string[];
  enabled?: boolean;
  allow_balance_pay?: boolean;
  allow_wallet_overflow?: boolean;
  max_purchase_per_user?: number;
  upgrade_group?: string;
  downgrade_group?: string;
  quota_reset_period?: string;
  quota_reset_custom_seconds?: number;
};
type SubscriptionState = {
  subscriptions?: Array<{ plan_name?: string; plan_id?: number }>;
  all_subscriptions?: Array<{
    subscription?: {
      plan_title?: string;
      plan_name?: string;
      plan_id?: number;
      status?: string;
      start_time?: number;
      end_time?: number;
      amount_total?: number;
      amount_used?: number;
      next_reset_time?: number;
      last_reset_time?: number;
      source?: string;
      upgrade_group?: string;
      downgrade_group?: string;
      prev_user_group?: string;
      allow_wallet_overflow?: boolean;
    };
  }>;
  billing_preference?: "balance_first" | "subscription_first";
};

function formatSubscriptionDate(value?: number) {
  return value && value > 0 ? new Date(value * 1000).toLocaleString() : "-";
}

export default function Subscriptions() {
  const { t } = useLang();
  const { isAdmin } = useApp();
  const location = useLocation();
  const showAdminTools = isAdmin && location.pathname === "/user-subscriptions";
  const toast = useToast();
  const confirm = useConfirm();
  const [adminPlans, setAdminPlans] = useState<Array<Record<string, unknown>>>(
    [],
  );
  const [planForm, setPlanForm] = useState({
    title: "",
    price_amount: "0",
    duration_value: "1",
    duration_unit: "month",
    total_amount: "0",
    sort_order: "0",
    enabled: true,
  });
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [planSaving, setPlanSaving] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");
  const [adminPlanId, setAdminPlanId] = useState("");
  const [adminSubscriptionId, setAdminSubscriptionId] = useState("");
  const [adminAction, setAdminAction] = useState(false);
  const [userSubscriptions, setUserSubscriptions] = useState<unknown>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [active, setActive] = useState<SubscriptionState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<
    Array<{ type: string; name?: string }>
  >([]);
  const [paymentMethod, setPaymentMethod] = useState("balance");
  const [billingPreference, setBillingPreference] =
    useState<SubscriptionState["billing_preference"]>("subscription_first");

  const loadSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const [availablePlans, current] = await Promise.all([
        api.get<Array<{ plan: Plan }>>("/subscription/plans"),
        api.mySubscription() as Promise<SubscriptionState>,
      ]);
      setPlans(availablePlans.map((item) => item.plan));
      setActive(current);
      setBillingPreference(current.billing_preference ?? "subscription_first");
      if (showAdminTools) {
        const managed = await api.adminSubscriptionPlans();
        setAdminPlans(managed.map((item) => item.plan));
      }
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load subscriptions.", "无法读取订阅信息。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubscriptions();
  }, [showAdminTools]);
  const loadPaymentMethods = async () => {
    try {
      const info = await api.topupInfo();
      if (info.payment_compliance_confirmed === false)
        openPaymentComplianceGate();
      setPaymentMethods(info.pay_methods ?? []);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load payment methods.", "无法读取支付方式。");
      setError(message);
      toast.error({ message });
    }
  };

  useEffect(() => {
    void loadPaymentMethods();
    const refresh = () => void loadPaymentMethods();
    window.addEventListener("zzznew:payment-compliance-confirmed", refresh);
    return () =>
      window.removeEventListener(
        "zzznew:payment-compliance-confirmed",
        refresh,
      );
  }, [t, toast]);

  async function purchase(planId: number) {
    const confirmed = await confirm({
      title: t("Confirm subscription purchase", "确认订阅购买"),
      description: t(
        `Subscribe to this plan using ${paymentMethod}?`,
        `使用 ${paymentMethod} 购买此订阅？`,
      ),
      confirmText: t("Continue", "继续"),
      variant: "default",
    });
    if (!confirmed) return;
    setPurchasing(planId);
    setError(null);
    try {
      let response: {
        url?: string;
        pay_link?: string;
        checkout_url?: string;
        data?: { pay_link?: string; checkout_url?: string } | Record<string, string> | string;
        message?: string;
      } | void;
      if (paymentMethod === "balance")
        response = await api.purchaseSubscription(planId);
      else if (paymentMethod === "stripe")
        response = await api.purchaseSubscriptionStripe(planId);
      else if (paymentMethod === "creem")
        response = await api.purchaseSubscriptionCreem(planId);
      else if (paymentMethod === "waffo-pancake")
        response = await api.purchaseSubscriptionWaffo(planId);
      else response = await api.purchaseSubscriptionEpay(planId, paymentMethod);
      if (response && response.message === "error")
        throw new Error(
          typeof response.data === "string"
            ? response.data
            : t("Payment request was rejected.", "支付请求被服务端拒绝。"),
        );
      const paymentUrl =
        response?.url ??
        response?.pay_link ??
        response?.checkout_url ??
        (typeof response?.data === "object"
          ? (response.data.pay_link ?? response.data.checkout_url)
          : response?.data);
      if (paymentUrl) {
        toast.success({
          message: t("Redirecting to payment...", "正在跳转至支付页面..."),
        });
        if (paymentMethod !== "balance" && typeof response?.data === "object" && response.data !== null && !("pay_link" in response.data) && !("checkout_url" in response.data)) {
          submitPaymentForm(paymentUrl, response.data);
          return;
        }
        window.location.assign(paymentUrl);
      } else {
        toast.success({ message: t("Subscription updated.", "订阅已更新。") });
      }
      await loadSubscriptions();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to purchase this plan.", "无法购买该订阅计划。");
      setError(message);
      toast.error({ message });
    } finally {
      setPurchasing(null);
    }
  }

  function submitPaymentForm(url: string, fields: Record<string, string>) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = url;
    form.style.display = "none";
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }
  async function updateBillingPreference(
    value: "balance_first" | "subscription_first",
  ) {
    const previous = billingPreference;
    setBillingPreference(value);
    setError(null);
    try {
      await api.updateSubscriptionPreference({
        billing_preference: value,
      });
      toast.success({
        message: t("Billing preference updated.", "账单优先级已更新。"),
      });
    } catch (cause) {
      setBillingPreference(previous);
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to update billing preference.", "无法更新账单优先级。");
      setError(message);
      toast.error({ message });
    }
  }
  async function togglePlan(plan: Record<string, unknown>) {
    const id = Number(plan.id);
    if (!id) return;
    try {
      await api.updateSubscriptionPlanStatus(id, plan.enabled !== true);
      await loadSubscriptions();
      toast.success({
        message:
          plan.enabled === true
            ? t("Plan disabled.", "计划已停用。")
            : t("Plan enabled.", "计划已启用。"),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to update plan status.", "无法更新计划状态。");
      setError(message);
      toast.error({ message });
    }
  }
  async function savePlan(event: React.FormEvent) {
    event.preventDefault();
    setPlanSaving(true);
    setError(null);
    try {
      const plan = {
        title: planForm.title.trim(),
        price_amount: Number(planForm.price_amount),
        duration_value: Number(planForm.duration_value),
        duration_unit: planForm.duration_unit,
        total_amount: Number(planForm.total_amount),
        sort_order: Number(planForm.sort_order),
        enabled: planForm.enabled,
      };
      if (editingPlanId) await api.updateSubscriptionPlan(editingPlanId, plan);
      else await api.createSubscriptionPlan(plan);
      setEditingPlanId(null);
      setPlanForm({ ...planForm, title: "" });
      await loadSubscriptions();
      toast.success({
        message: editingPlanId
          ? t("Plan updated.", "计划已更新。")
          : t("Plan created.", "计划已创建。"),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to save plan.", "无法保存订阅计划。");
      setError(message);
      toast.error({ message });
    } finally {
      setPlanSaving(false);
    }
  }
  function editPlan(plan: Record<string, unknown>) {
    const id = Number(plan.id);
    if (!Number.isInteger(id) || id <= 0) {
      setError(t("This plan has no valid ID.", "该计划没有有效 ID。"));
      return;
    }
    setEditingPlanId(id);
    setPlanForm({
      title: String(plan.title ?? plan.name ?? ""),
      price_amount: String(plan.price_amount ?? plan.price ?? 0),
      duration_value: String(plan.duration_value ?? 1),
      duration_unit: String(plan.duration_unit ?? "month"),
      total_amount: String(plan.total_amount ?? 0),
      sort_order: String(plan.sort_order ?? 0),
      enabled: plan.enabled !== false,
    });
  }
  async function runAdminSubscriptionAction(
    action:
      | "bind"
      | "create"
      | "list"
      | "reset-user"
      | "reset-plan"
      | "invalidate"
      | "delete",
  ) {
    const userId = Number(adminUserId);
    const planId = Number(adminPlanId);
    const subscriptionId = Number(adminSubscriptionId);
    const needsUser = ["bind", "create", "list", "reset-user"].includes(action);
    const needsPlan = ["bind", "create", "reset-user", "reset-plan"].includes(
      action,
    );
    const needsSubscription = ["invalidate", "delete"].includes(action);
    if (
      (needsUser && (!Number.isInteger(userId) || userId <= 0)) ||
      (needsPlan && (!Number.isInteger(planId) || planId <= 0)) ||
      (needsSubscription &&
        (!Number.isInteger(subscriptionId) || subscriptionId <= 0))
    ) {
      setError(
        t("Enter valid user and plan IDs.", "请输入有效的用户 ID 和计划 ID。"),
      );
      return;
    }
    if (action === "delete" || action === "invalidate") {
      const confirmed = await confirm({
        title:
          action === "delete"
            ? t("Delete subscription?", "删除订阅？")
            : t("Invalidate subscription?", "使订阅失效？"),
        description: t("This action cannot be undone.", "此操作无法撤销。"),
        confirmText: t("Confirm", "确认"),
        variant: "danger",
      });
      if (!confirmed) return;
    }
    setAdminAction(true);
    setError(null);
    try {
      if (action === "bind") await api.bindSubscription(userId, planId);
      if (action === "create") await api.createUserSubscription(userId, planId);
      if (action === "list")
        setUserSubscriptions(await api.listUserSubscriptions(userId));
      if (action === "reset-user")
        setUserSubscriptions(await api.resetUserSubscriptions(userId, planId));
      if (action === "reset-plan")
        setUserSubscriptions(await api.resetPlanSubscriptions(planId));
      if (action === "invalidate")
        await api.invalidateUserSubscription(subscriptionId);
      if (action === "delete") await api.deleteUserSubscription(subscriptionId);
      toast.success({ message: t("Operation completed.", "操作已完成。") });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Subscription management failed.", "订阅管理操作失败。");
      setError(message);
      toast.error({ message });
    } finally {
      setAdminAction(false);
    }
  }

  return (
    <PageContainer
      title={t("Subscription Tiers", "订阅计划")}
      subtitle={t(
        "Plans configured by the service administrator.",
        "由服务管理员配置的订阅计划。",
      )}
      isLoading={loading}
      error={error}
      onRetry={loadSubscriptions}
    >
      <div className="mb-4 grid max-w-2xl gap-3 border border-[#121110]/10 bg-white p-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 text-overline font-mono uppercase tracking-widest text-muted">
          {t("Payment", "支付方式")}
          <SelectMenu value={paymentMethod} onChange={setPaymentMethod} ariaLabel={t("Payment method", "支付方式")} options={[{ value: "balance", label: t("Balance", "余额") }, ...paymentMethods.map((method) => ({ value: method.type, label: method.name ?? method.type }))]} />
        </label>
        <label className="flex items-center gap-3 text-overline font-mono uppercase tracking-widest text-muted">
          {t("Billing priority", "扣费优先级")}
          <SelectMenu value={billingPreference} onChange={(value) => void updateBillingPreference(value as "balance_first" | "subscription_first")} ariaLabel={t("Billing priority", "扣费优先级")} options={[{ value: "subscription_first", label: t("Subscription first", "订阅优先") }, { value: "balance_first", label: t("Balance first", "余额优先") }]} />
        </label>
      </div>
      {plans.length === 0 ? (
        <div className="border border-dashed border-[#121110]/20 bg-white p-16 text-center text-label text-muted">
          {t("No subscription plans are available.", "暂无可用订阅计划。")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-0 border border-[#121110]/10 bg-white md:grid-cols-3">
          {plans.map((plan) => {
            const current = active.subscriptions?.some(
              (item) =>
                item.plan_id === plan.id ||
                item.plan_name === (plan.title ?? plan.name),
            );
            const title =
              plan.title ?? plan.name ?? t("Untitled plan", "未命名计划");
            const price = plan.price_amount ?? plan.price ?? 0;
            const balanceUnavailable = plan.allow_balance_pay === false;
            const cycle =
              plan.billing_cycle ??
              (plan.duration_value && plan.duration_unit
                ? `${plan.duration_value} ${plan.duration_unit}`
                : t("period", "周期"));
            return (
              <div
                key={plan.id}
                className={`relative border-b border-[#121110]/10 p-8 md:border-b-0 md:border-r last:border-0 ${current ? "bg-inverse text-white" : "text-[#121110]"}`}
              >
                <h3 className="font-mono text-caption uppercase tracking-[0.2em] opacity-60">
                  {title}
                </h3>
                <div className="mb-8 mt-4">
                  <span className="font-serif text-4xl">
                    {plan.currency ?? "USD"} {price}
                  </span>
                  <span className="ml-2 font-mono text-caption opacity-60">
                    / {cycle}
                  </span>
                </div>
                <p className="mb-8 text-label opacity-70">
                  {plan.description || "-"}
                </p>
                <ul className="space-y-4">
                  {(plan.features ?? []).map((feature) => (
                    <li key={feature} className="flex gap-3 text-label">
                      <Check className="h-4 w-4 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {!current && (
                  <button
                    onClick={() => void purchase(plan.id)}
                    disabled={
                      purchasing !== null ||
                      (paymentMethod === "balance" && balanceUnavailable)
                    }
                    className="mt-8 w-full border border-current px-4 py-3 text-overline font-mono uppercase tracking-widest transition-colors hover:bg-inverse hover:text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {purchasing === plan.id && (
                      <Loader2
                        className="w-3.5 h-3.5 animate-spin"
                        strokeWidth={1.5}
                      />
                    )}
                    {purchasing === plan.id
                      ? t("Processing", "处理中")
                      : paymentMethod === "balance"
                        ? balanceUnavailable
                          ? t("Balance payment unavailable", "不支持余额购买")
                          : t("Buy with balance", "余额购买")
                        : t("Continue to payment", "继续支付")}
                  </button>
                )}
                {current && (
                  <span className="absolute right-6 top-6 font-mono text-caption uppercase opacity-60">
                    {t("Current", "当前")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {(active.all_subscriptions?.length ?? 0) > 0 && (
        <section className="mt-8 border border-[#121110]/10 bg-white p-6">
          <h2 className="mb-4 font-serif text-xl">
            {t("Subscription history", "订阅历史")}
          </h2>
          <div className="space-y-3">
            {active.all_subscriptions?.map((entry, index) => {
              const subscription = entry.subscription;
              if (!subscription) return null;
              const total = subscription.amount_total ?? 0;
              const used = subscription.amount_used ?? 0;
              return (
                <div
                  key={`${subscription.start_time ?? index}-${subscription.plan_title ?? subscription.plan_name ?? index}`}
                  className="grid gap-2 border-b border-[#121110]/10 pb-3 text-[12px] sm:grid-cols-2 lg:grid-cols-4"
                >
                  <span className="font-medium">
                    {subscription.plan_title ??
                      subscription.plan_name ??
                      (subscription.plan_id ? `#${subscription.plan_id}` : "-")}
                  </span>
                  <span className="text-muted">
                    {t("Status", "状态")}: {subscription.status ?? "-"}
                  </span>
                  <span className="text-muted">
                    {t("Period", "周期")}:{" "}
                    {formatSubscriptionDate(subscription.start_time)} -{" "}
                    {formatSubscriptionDate(subscription.end_time)}
                  </span>
                  <span className="text-muted">
                    {t("Quota", "额度")}: {used.toLocaleString()} /{" "}
                    {total > 0 ? total.toLocaleString() : "∞"}
                  </span>
                  <span className="text-muted">
                    {t("Next reset", "下次重置")}:{" "}
                    {formatSubscriptionDate(subscription.next_reset_time)}
                  </span>
                  <span className="text-muted">
                    {t("Last reset", "上次重置")}:{" "}
                    {formatSubscriptionDate(subscription.last_reset_time)}
                  </span>
                  <span className="text-muted">
                    {t("Source", "来源")}: {subscription.source || "-"}
                  </span>
                  <span className="text-muted">
                    {t("Wallet fallback", "余额兜底")}:{" "}
                    {subscription.allow_wallet_overflow
                      ? t("Allowed", "允许")
                      : t("Blocked", "不允许")}
                  </span>
                  {(subscription.upgrade_group ||
                    subscription.downgrade_group ||
                    subscription.prev_user_group) && (
                    <span className="text-muted lg:col-span-2">
                      {t("Group transition", "分组变更")}:{" "}
                      {subscription.prev_user_group || "-"} -&gt;{" "}
                      {subscription.upgrade_group ||
                        subscription.downgrade_group ||
                        "-"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      {showAdminTools && (
        <section className="mt-8 border border-[#121110]/10 bg-white p-6">
          <h2 className="mb-4 font-serif text-xl">
            {t("Admin plan inventory", "管理员计划库存")}
          </h2>
          <form
            onSubmit={savePlan}
            className="mb-6 grid gap-3 border-b border-[#121110]/10 pb-6 md:grid-cols-3"
          >
            <input
              required
              placeholder={t("Title", "标题")}
              value={planForm.title}
              onChange={(e) =>
                setPlanForm({ ...planForm, title: e.target.value })
              }
              className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
            />
            <input
              required
              min="0"
              type="number"
              placeholder={t("Price", "价格")}
              value={planForm.price_amount}
              onChange={(e) =>
                setPlanForm({ ...planForm, price_amount: e.target.value })
              }
              className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
            />
            <input
              required
              min="1"
              type="number"
              placeholder={t("Duration", "周期数值")}
              value={planForm.duration_value}
              onChange={(e) =>
                setPlanForm({ ...planForm, duration_value: e.target.value })
              }
              className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
            />
            <SelectMenu value={planForm.duration_unit} onChange={(value) => setPlanForm({ ...planForm, duration_unit: value })} options={[{ value: "month", label: t("Month", "月") }, { value: "year", label: t("Year", "年") }, { value: "day", label: t("Day", "日") }]} />
            <input
              min="0"
              type="number"
              placeholder={t("Total quota", "总额度")}
              value={planForm.total_amount}
              onChange={(e) =>
                setPlanForm({ ...planForm, total_amount: e.target.value })
              }
              className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={planSaving}
              className="flex items-center gap-2 bg-inverse px-4 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
            >
              {planSaving && (
                <Loader2
                  className="w-3.5 h-3.5 animate-spin"
                  strokeWidth={1.5}
                />
              )}
              {editingPlanId
                ? t("Update plan", "更新计划")
                : t("Create plan", "创建计划")}
            </button>
            {editingPlanId && (
              <button
                type="button"
                onClick={() => {
                  setEditingPlanId(null);
                  setPlanForm({ ...planForm, title: "" });
                }}
                className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
              >
                {t("Cancel edit", "取消编辑")}
              </button>
            )}
          </form>
          {adminPlans.length === 0 ? (
            <p className="text-[12px] text-muted">
              {t("No plans returned.", "暂无计划。")}
            </p>
          ) : (
            <div className="space-y-3">
              {adminPlans.map((plan) => (
                <div
                  key={String(plan.id)}
                  className="flex items-center justify-between border-b border-[#121110]/10 py-3"
                >
                  <div>
                    <p className="text-sm">
                      {String(plan.title ?? plan.name ?? plan.id)}
                    </p>
                    <p className="font-mono text-caption text-muted">
                      {String(plan.currency ?? "USD")}{" "}
                      {String(plan.price_amount ?? plan.price ?? 0)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editPlan(plan)}
                      className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
                    >
                      {t("Edit", "编辑")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminPlanId(String(plan.id));
                        void runAdminSubscriptionAction("reset-plan");
                      }}
                      disabled={adminAction}
                      className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
                    >
                      {t("Reset", "重置")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void togglePlan(plan)}
                      className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
                    >
                      {plan.enabled === true
                        ? t("Disable", "停用")
                        : t("Enable", "启用")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 border-t border-[#121110]/10 pt-6">
            <h3 className="mb-3 font-serif text-lg">
              {t("User subscription operations", "用户订阅操作")}
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="number"
                min="1"
                placeholder={t("User ID", "用户 ID")}
                value={adminUserId}
                onChange={(e) => setAdminUserId(e.target.value)}
                className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
              />
              <input
                type="number"
                min="1"
                placeholder={t("Plan ID", "计划 ID")}
                value={adminPlanId}
                onChange={(e) => setAdminPlanId(e.target.value)}
                className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
              />
              <input
                type="number"
                min="1"
                placeholder={t("Subscription ID", "订阅 ID")}
                value={adminSubscriptionId}
                onChange={(e) => setAdminSubscriptionId(e.target.value)}
                className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={adminAction}
                onClick={() => void runAdminSubscriptionAction("bind")}
                className="bg-inverse px-3 py-2 text-overline font-mono uppercase text-white"
              >
                {t("Bind", "绑定")}
              </button>
              <button
                type="button"
                disabled={adminAction}
                onClick={() => void runAdminSubscriptionAction("create")}
                className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
              >
                {t("Create subscription", "创建订阅")}
              </button>
              <button
                type="button"
                disabled={adminAction}
                onClick={() => void runAdminSubscriptionAction("list")}
                className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
              >
                {t("List user", "查看用户")}
              </button>
              <button
                type="button"
                disabled={adminAction}
                onClick={() => void runAdminSubscriptionAction("reset-user")}
                className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
              >
                {t("Reset user", "重置用户")}
              </button>
              <button
                type="button"
                disabled={adminAction}
                onClick={() => void runAdminSubscriptionAction("invalidate")}
                className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
              >
                {t("Invalidate", "失效")}
              </button>
              <button
                type="button"
                disabled={adminAction}
                onClick={() => void runAdminSubscriptionAction("delete")}
                className="border border-red-700/40 px-3 py-2 text-overline font-mono uppercase text-red-700"
              >
                {t("Delete", "删除")}
              </button>
            </div>
            {userSubscriptions !== null && (
              <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap break-all bg-primary p-3 font-mono text-caption">
                {JSON.stringify(userSubscriptions, null, 2)}
              </pre>
            )}
          </div>
        </section>
      )}
    </PageContainer>
  );
}
