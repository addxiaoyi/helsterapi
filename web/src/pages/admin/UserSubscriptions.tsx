import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { SelectMenu } from "../../components/ui/SelectMenu";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type UserSubscription = Record<string, unknown> & {
  id: number | string;
  plan_id?: number;
  plan_name?: string;
  status?: string;
  start_time?: number;
  end_time?: number;
  next_reset_time?: number;
  remaining_quota?: number;
  total_quota?: number;
};

function readNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatTime(value: unknown) {
  const n = readNumber(value);
  return n > 1e12 ? new Date(n).toLocaleString() : n > 0 ? new Date(n * 1000).toLocaleString() : "-";
}

function unwrapList(payload: unknown): UserSubscription[] {
  if (Array.isArray(payload)) return payload as UserSubscription[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.subscriptions)) return obj.subscriptions as UserSubscription[];
    if (Array.isArray(obj.items)) return obj.items as UserSubscription[];
  }
  return [];
}

export default function UserSubscriptions() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [userId, setUserId] = useState("");
  const [list, setList] = useState<UserSubscription[]>([]);
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [bindingPlanId, setBindingPlanId] = useState("");
  const [resetPlanId, setResetPlanId] = useState("");

  const loadPlans = useCallback(async () => {
    setPlansError(null);
    try {
      const response = await api.adminSubscriptionPlans();
      const list = Array.isArray(response)
        ? response
        : ((response as unknown as { plans?: unknown[] })?.plans as
            | unknown[]
            | undefined) ?? [];
      setPlans(
        list.map(
          (item) => (item as { plan: Record<string, unknown> }).plan ?? item,
        ) as Array<Record<string, unknown>>,
      );
    } catch (cause) {
      console.error("Unable to load plans", cause);
      setPlansError(
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load subscription plans.", "无法加载订阅计划。"),
      );
    }
  }, [t]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const loadUser = useCallback(
    async (idToLoad: string) => {
      if (!idToLoad || !/^\d+$/.test(idToLoad)) {
        setList([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const payload = await api.listUserSubscriptions(readNumber(idToLoad));
        setList(unwrapList(payload));
      } catch (cause) {
        const message =
          cause instanceof ApiError
            ? cause.message
            : t("Unable to load user subscriptions.", "无法加载用户订阅。");
        setError(message);
        toast.error({ message });
        setList([]);
      } finally {
        setLoading(false);
      }
    },
    [t, toast],
  );

  const createSubscription = async () => {
    const uid = readNumber(userId);
    const pid = readNumber(bindingPlanId);
    if (!uid || !pid) {
      const message = t("Both user ID and plan ID are required.", "需要填写用户 ID 和计划 ID。");
      setError(message);
      toast.error({ message });
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await api.createUserSubscription(uid, pid);
      toast.success({ message: t("Subscription bound", "订阅已绑定") });
      await loadUser(String(uid));
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to bind subscription.", "无法绑定订阅。");
      setError(message);
      toast.error({ message });
    } finally {
      setWorking(false);
    }
  };

  const resetUserSubscriptions = async () => {
    const uid = readNumber(userId);
    const pid = readNumber(resetPlanId);
    if (!uid || !pid) {
      const message = t("Both user ID and plan ID are required.", "需要填写用户 ID 和计划 ID。");
      setError(message);
      toast.error({ message });
      return;
    }
    const ok = await confirm({
      title: t("Reset user subscriptions", "重置用户订阅"),
      description: t(
        "Reset this user's subscriptions to the next reset time?",
        "将该用户的订阅时间重置到下一个扣费点？",
      ),
      confirmText: t("Reset", "重置"),
      variant: "danger",
    });
    if (!ok) return;
    setWorking(true);
    setError(null);
    try {
      await api.resetUserSubscriptions(uid, pid, true);
      toast.success({ message: t("Subscriptions reset", "订阅已重置") });
      await loadUser(String(uid));
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to reset user subscriptions.", "无法重置用户订阅。");
      setError(message);
      toast.error({ message });
    } finally {
      setWorking(false);
    }
  };

  const invalidate = async (item: UserSubscription) => {
    const id = readNumber(item.id);
    if (!id) return;
    const ok = await confirm({
      title: t("Invalidate subscription", "使订阅失效"),
      description: t("Invalidate this subscription?", "确定使该订阅失效？"),
      confirmText: t("Invalidate", "失效"),
      variant: "danger",
    });
    if (!ok) return;
    setWorking(true);
    setError(null);
    try {
      await api.invalidateUserSubscription(id);
      toast.success({ message: t("Subscription invalidated", "订阅已失效") });
      await loadUser(userId);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to invalidate subscription.", "无法使订阅失效。");
      setError(message);
      toast.error({ message });
    } finally {
      setWorking(false);
    }
  };

  const remove = async (item: UserSubscription) => {
    const id = readNumber(item.id);
    if (!id) return;
    const ok = await confirm({
      title: t("Delete subscription", "删除订阅"),
      description: t("Delete this subscription record?", "确定删除该订阅记录？"),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    setWorking(true);
    setError(null);
    try {
      await api.deleteUserSubscription(id);
      toast.success({ message: t("Deleted", "已删除") });
      await loadUser(userId);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to delete subscription.", "无法删除订阅。");
      setError(message);
      toast.error({ message });
    } finally {
      setWorking(false);
    }
  };

  const columns = [
    {
      key: "id",
      title: t("Subscription", "订阅"),
      render: (item: UserSubscription) => (
        <div className="flex flex-col">
          <span className="font-mono text-[12px]">#{String(item.id)}</span>
          <span className="text-caption text-muted">
            {String(item.plan_name ?? item.plan_id ?? "-")}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      title: t("Status", "状态"),
      render: (item: UserSubscription) => (
        <span className="text-overline font-mono uppercase tracking-widest">
          {String(item.status ?? "-")}
        </span>
      ),
    },
    {
      key: "quota",
      title: t("Quota", "额度"),
      render: (item: UserSubscription) => (
        <span className="font-mono text-[12px]">
          {readNumber(item.remaining_quota).toLocaleString()} / {readNumber(item.total_quota).toLocaleString()}
        </span>
      ),
    },
    {
      key: "start_time",
      title: t("Start", "开始"),
      render: (item: UserSubscription) => (
        <span className="font-mono text-caption text-muted">
          {formatTime(item.start_time)}
        </span>
      ),
    },
    {
      key: "end_time",
      title: t("Ends", "结束"),
      render: (item: UserSubscription) => (
        <span className="font-mono text-caption text-muted">
          {formatTime(item.end_time ?? item.next_reset_time)}
        </span>
      ),
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (item: UserSubscription) => (
        <div className="flex items-center gap-3 text-muted">
          <button
            type="button"
            title={t("Invalidate", "失效")}
            onClick={() => void invalidate(item)}
            disabled={working}
            className="hover:text-[#121110] disabled:opacity-40"
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("Delete", "删除")}
            onClick={() => void remove(item)}
            disabled={working}
            className="hover:text-red-600 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title={t("User Subscriptions", "用户订阅")}
      subtitle={t(
        "Bind subscription plans to users and reset or revoke their entitlements.",
        "为用户绑定订阅计划，重置或撤销其权益。",
      )}
      isLoading={loading}
      error={error ?? plansError}
      onRetry={() => void loadUser(userId)}
      actions={[
        {
          label: t("Load", "加载"),
          icon: <RefreshCw className="h-3.5 w-3.5" />,
          onClick: () => void loadUser(userId),
          disabled: loading || !userId,
        },
        {
          label: t("Bind", "绑定"),
          icon: <Plus className="h-3.5 w-3.5" />,
          onClick: () => void createSubscription(),
          disabled: working || !userId || !bindingPlanId,
        },
        {
          label: t("Reset", "重置"),
          icon: <RotateCcw className="h-3.5 w-3.5" />,
          onClick: () => void resetUserSubscriptions(),
          disabled: working || !userId || !resetPlanId,
        },
      ]}
    >
      <section className="mb-6 grid gap-4 border border-[#121110]/10 bg-white p-6 md:grid-cols-2">
        <label className="space-y-1 text-overline font-mono uppercase">
          <span>{t("User ID", "用户 ID")}</span>
          <div className="flex items-center gap-2 border-b border-[#121110]/20 px-2 py-2">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder={t("Search by user ID", "按用户 ID 搜索")}
              className="w-full bg-transparent text-[12px] outline-none"
            />
            <button
              type="button"
              onClick={() => void loadUser(userId)}
              className="ml-auto flex items-center gap-1 border border-[#121110]/20 px-2 py-1 text-overline font-mono uppercase"
            >
              <RefreshCw className="h-3 w-3" />
              {t("Load", "加载")}
            </button>
          </div>
        </label>
        <label className="space-y-1 text-overline font-mono uppercase">
          <span>{t("Bind to plan", "绑定计划")}</span>
          <div className="flex items-center gap-2">
            <SelectMenu value={bindingPlanId} onChange={setBindingPlanId} options={[{ value: "", label: t("Choose a plan", "选择计划") }, ...plans.map((plan) => ({ value: String(plan.id), label: String(plan.title ?? plan.name ?? plan.id) }))]} />
            <button
              type="button"
              onClick={() => void createSubscription()}
              disabled={working || !userId || !bindingPlanId}
              className="flex items-center gap-1 border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("Bind", "绑定")}
            </button>
          </div>
        </label>
        <label className="space-y-1 text-overline font-mono uppercase md:col-span-2">
          <span>{t("Reset plan", "重置订阅计划")}</span>
          <div className="flex items-center gap-2">
            <SelectMenu value={resetPlanId} onChange={setResetPlanId} options={[{ value: "", label: t("Choose a plan", "选择计划") }, ...plans.map((plan) => ({ value: String(plan.id), label: String(plan.title ?? plan.name ?? plan.id) }))]} />
            <button
              type="button"
              onClick={() => void resetUserSubscriptions()}
              disabled={working || !userId || !resetPlanId}
              className="flex items-center gap-1 border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("Reset", "重置")}
            </button>
          </div>
        </label>
      </section>

      <DataTable
        columns={columns}
        data={list}
        total={list.length}
        page={1}
        pageSize={Math.max(list.length, 10)}
        onPageChange={() => {
          /* single-shot query */
        }}
      />
    </PageContainer>
  );
}
