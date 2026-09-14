import React, { useCallback, useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { useApp } from "../../lib/AppContext";
import { useLang } from "../../lib/LanguageContext";
import { ApiError, api, type UserGroups } from "../../lib/api";
import {
  ScanFace,
  ChevronRight,
  Layers,
  Gauge,
  Users,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";

function formatQuota(value: number | string | null | undefined, quotaPerUnit?: number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  const displayValue =
    quotaPerUnit && quotaPerUnit > 0 ? numericValue / quotaPerUnit : numericValue;
  return displayValue.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

function formatRatio(ratio: number | string) {
  if (typeof ratio === "string") return ratio;
  if (!Number.isFinite(ratio)) return "-";
  if (ratio === 0) return "0";
  if (ratio >= 1) return ratio.toFixed(2);
  return ratio.toFixed(3);
}

function formatMoney(value: number | string | null | undefined, currency: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? `${currency}${numericValue.toLocaleString()}`
    : "-";
}

function formatAccessUntil(value: unknown, unlimitedLabel: string) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return unlimitedLabel;
  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

export default function Quota() {
  const { t } = useLang();
  const { user, refreshUser } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [affCode, setAffCode] = useState("");
  const [affLoading, setAffLoading] = useState(true);
  const [groups, setGroups] = useState<UserGroups>({});
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [transferQuota, setTransferQuota] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [billingUsage, setBillingUsage] = useState<number | null>(null);
  const [billingSubscription, setBillingSubscription] = useState<{
    has_payment_method: boolean;
    soft_limit_usd: number;
    hard_limit_usd: number;
    system_hard_limit_usd: number;
    access_until: number;
  } | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [quotaPerUnit, setQuotaPerUnit] = useState<number>();

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    setError(null);
    try {
      const data = await api.userGroups();
      setGroups(data ?? {});
    } catch (cause) {
      setGroups({});
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load group summary.", "无法加载分组摘要。");
      setError(message);
      toast.error({ message });
    } finally {
      setGroupsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    setAffLoading(true);
    api
      .affCode()
      .then((code) => setAffCode(code ?? ""))
      .catch((cause) => {
        const message =
          cause instanceof ApiError
            ? cause.message
            : t("Unable to load referral code.", "无法加载推广码。");
        setError(message);
        toast.error({ message });
      })
      .finally(() => setAffLoading(false));
    void loadGroups();
    void Promise.all([
      api.dashboardBillingUsage(),
      api.dashboardBillingSubscription(),
      api.status(),
    ])
      .then(([usage, subscription, status]) => {
        setBillingUsage(
          Number.isFinite(usage.total_usage) ? usage.total_usage : null,
        );
        setBillingSubscription(subscription);
        setCurrencySymbol(
          status.quota_display_type === "currency"
            ? status.custom_currency_symbol?.trim() || "$"
            : "",
        );
        setQuotaPerUnit(
          status.quota_display_type === "currency" &&
            Number.isFinite(status.quota_per_unit) &&
            (status.quota_per_unit ?? 0) > 0
            ? status.quota_per_unit
            : undefined,
        );
      })
      .catch(() => {
        setBillingUsage(null);
        setBillingSubscription(null);
        setCurrencySymbol("$");
        setQuotaPerUnit(undefined);
      });
  }, [loadGroups, t, toast]);

  async function transferQuotaToBalance(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const quota = Number(transferQuota);
    if (!Number.isInteger(quota) || quota <= 0) {
      setError(
        t("Enter a positive integer quota.", "请输入大于 0 的整数额度。"),
      );
      return;
    }
    const confirmed = await confirm({
      title: t("Confirm transfer", "确认转入"),
      description: t(
        `Transfer ${quota.toLocaleString()} units of referral quota to your main balance?`,
        `确认将 ${quota.toLocaleString()} 推广额度转入主余额？`,
      ),
      confirmText: t("Transfer", "转入"),
      variant: "default",
    });
    if (!confirmed) return;
    setTransferring(true);
    setError(null);
    setInfo(null);
    try {
      await api.transferAffQuota(quota);
      setTransferQuota("");
      const message = t(
        "Transfer completed. The balance will refresh shortly.",
        "转入已完成，余额将很快刷新。",
      );
      setInfo(message);
      toast.success({ message });
      await refreshUser();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to transfer quota.", "额度转入失败。");
      setError(message);
      toast.error({ message });
    } finally {
      setTransferring(false);
    }
  }

  const totalQuota = user?.quota ?? 0;
  const usedQuota = user?.used_quota ?? 0;
  const remainingQuota = Math.max(totalQuota - usedQuota, 0);
  const usagePercent =
    totalQuota > 0 ? Math.min((usedQuota / totalQuota) * 100, 100) : 0;
  const groupEntries = Object.entries(groups);
  const currentGroup = (user?.group || "").toLowerCase();
  const requestCount = user?.request_count ?? 0;

  return (
    <PageContainer
      title={t("Quota Atlas", "算力配额图谱")}
      subtitle={t(
        "Review your compute allowance, referral earnings, and the groups that govern access.",
        "查看您的算力额度、推广收益以及限定访问权限的分组。",
      )}
      error={error}
      onRetry={() => {
        setError(null);
        void loadGroups();
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        {(billingUsage !== null || billingSubscription !== null) && (
          <div className="border border-[#121110]/10 bg-white p-5 lg:col-span-3">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-overline font-mono uppercase tracking-widest text-muted">
                  {t("API billing usage", "API 计费使用量")}
                </p>
                <p className="mt-2 font-mono text-xl text-[#121110]">
                  {billingUsage === null ? "-" : billingUsage.toLocaleString()}
                </p>
              </div>
              {billingSubscription && (
                <>
                  <div>
                    <p className="text-overline font-mono uppercase tracking-widest text-muted">
                      {t("Payment method", "支付方式")}
                    </p>
                    <p className="mt-2 font-mono text-sm text-[#121110]">
                      {billingSubscription.has_payment_method
                        ? t("Configured", "已配置")
                        : t("Not configured", "未配置")}
                    </p>
                  </div>
                  {(
                    [
                      ["soft_limit_usd", "Soft limit", "软限额"],
                      ["hard_limit_usd", "Hard limit", "硬限额"],
                      ["system_hard_limit_usd", "System limit", "系统限额"],
                    ] as const
                  ).map(([key, en, zh]) => (
                    <div key={key}>
                      <p className="text-overline font-mono uppercase tracking-widest text-muted">
                        {t(en, zh)}
                      </p>
                      <p className="mt-2 font-mono text-xl text-[#121110]">
                        {formatMoney(billingSubscription[key], currencySymbol)}
                      </p>
                    </div>
                  ))}
                  <div>
                    <p className="text-overline font-mono uppercase tracking-widest text-muted">
                      {t("Access until", "有效期至")}
                    </p>
                    <p className="mt-2 font-mono text-sm text-[#121110]">
                      {formatAccessUntil(
                        billingSubscription.access_until,
                        t("Unlimited", "无限期"),
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {/* Left: Balance card + stats + transfer */}
        <div className="space-y-6">
          {/* Black card replica with available compute */}
          <div className="relative overflow-hidden bg-inverse text-[#FAFAFA] p-8 aspect-[1.586/1] shadow-[0_16px_40px_rgb(0,0,0,0.15)] group">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http:/* www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.08%22/%3E%3C/svg%3E')] mix-blend-overlay pointer-events-none" />
            <div
              className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none transform translate-x-[-100%] group-hover:translate-x-[100%]"
              style={{ transition: "all 2s ease" }}
            />
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-overline font-mono uppercase tracking-[0.3em] text-[#FAFAFA]/50">
                  {t("Available Compute", "可用算力额度")}
                </span>
                <div className="w-8 h-5 border border-white/20 rounded-sm flex items-center justify-center opacity-70">
                  <div className="w-5 h-2 bg-white/20 rounded-sm" />
                </div>
              </div>
              <div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-xl font-serif text-[#FAFAFA]/50 leading-none pb-1">
                    {currencySymbol}
                  </span>
                  <h2 className="text-5xl md:text-6xl font-serif tracking-tight leading-none text-[#FAFAFA]">
                    {formatQuota(remainingQuota, quotaPerUnit)}
                  </h2>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-overline font-mono uppercase tracking-[0.2em] text-[#FAFAFA]/40">
                    {(
                      user?.group || t("Default group", "默认分组")
                    ).toUpperCase()}
                  </span>
                  <ScanFace
                    className="w-5 h-5 text-[#FAFAFA]/30"
                    strokeWidth={1}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Usage stats */}
          <div className="border border-[#121110]/10 bg-white p-8 shadow-[0_4px_24px_rgb(0,0,0,0.02)] space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-mono uppercase tracking-[0.1em] text-[#121110]">
                {t("Consumption", "消耗概览")}
              </h3>
              <Gauge className="w-4 h-4 text-[#121110]/40" strokeWidth={1.5} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-overline font-mono uppercase tracking-[0.2em] text-muted">
                  {t("Usage", "使用率")}
                </span>
                <span className="text-[12px] font-mono text-[#121110]">
                  {usagePercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-1 w-full bg-inverse/5 overflow-hidden">
                <div
                  className="h-full bg-inverse transition-all duration-500"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-[#121110]/5">
              <div>
                <p className="text-overline font-mono uppercase tracking-[0.2em] text-muted">
                  {t("Total", "总额度")}
                </p>
                <p className="mt-2 font-mono text-[15px] text-[#121110]">
                  {formatQuota(totalQuota, quotaPerUnit)}
                </p>
              </div>
              <div>
                <p className="text-overline font-mono uppercase tracking-[0.2em] text-muted">
                  {t("Used", "已用")}
                </p>
                <p className="mt-2 font-mono text-[15px] text-[#121110]">
                  {formatQuota(usedQuota, quotaPerUnit)}
                </p>
              </div>
              <div>
                <p className="text-overline font-mono uppercase tracking-[0.2em] text-muted">
                  {t("Requests", "请求数")}
                </p>
                <p className="mt-2 font-mono text-[15px] text-[#121110]">
                  {formatQuota(requestCount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: referral code + transfer */}
        <div className="space-y-6">
          <div className="border border-[#121110]/10 bg-white p-8 shadow-[0_4px_24px_rgb(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-mono uppercase tracking-[0.1em] text-[#121110]">
                {t("Referral Code", "推广码")}
              </h3>
              <ArrowRightLeft
                className="w-4 h-4 text-[#121110]/40"
                strokeWidth={1.5}
              />
            </div>
            <p className="font-mono text-3xl tracking-[0.2em] text-[#121110] break-all">
              {affLoading ? "••••••" : affCode || "—"}
            </p>
            <div className="grid grid-cols-3 gap-3 border-t border-[#121110]/10 pt-4 text-micro font-mono">
              <span className="text-muted">
                {t("Available referral quota", "可用推广额度")}
                <br />
                <strong className="text-[#121110]">
                  {formatQuota(user?.aff_quota ?? 0, quotaPerUnit)}
                </strong>
              </span>
              <span className="text-muted">
                {t("Referrals", "邀请人数")}
                <br />
                <strong className="text-[#121110]">
                  {(user?.aff_count ?? 0).toLocaleString()}
                </strong>
              </span>
              <span className="text-muted">
                {t("Total earned", "累计获得额度")}
                <br />
                <strong className="text-[#121110]">
                  {formatQuota(user?.aff_history_quota ?? 0, quotaPerUnit)}
                </strong>
              </span>
            </div>
            <p className="text-[12px] text-muted leading-relaxed">
              {t(
                "Share this code to earn referral quota. Earnings are credited as affiliate balance.",
                "分享此推广码以获得推广收益，收益将以推广额度形式计入。",
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!affCode) return;
                if (navigator.clipboard?.writeText) {
                  void navigator.clipboard.writeText(affCode);
                  toast.success({
                    message: t("Referral code copied.", "推广码已复制。"),
                  });
                }
              }}
              disabled={!affCode || affLoading}
              className="bg-transparent border border-[#121110]/20 text-[#121110] px-5 py-2 text-overline font-mono uppercase tracking-[0.2em] hover:border-[#121110] transition-colors disabled:opacity-40"
            >
              {t("Copy Code", "复制推广码")}
            </button>
          </div>

          <form
            onSubmit={transferQuotaToBalance}
            className="border border-[#121110]/10 bg-white p-8 shadow-[0_4px_24px_rgb(0,0,0,0.02)] space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-mono uppercase tracking-[0.1em] text-[#121110]">
                {t("Transfer Referral Quota", "转入推广额度")}
              </h3>
            </div>
            <p className="text-[12px] text-muted leading-relaxed">
              {t(
                "Move affiliate quota into your main compute balance.",
                "将推广额度划转至主算力余额。",
              )}
            </p>
            <div className="space-y-2">
              <label className="text-overline font-mono uppercase tracking-[0.2em] text-muted">
                {t("Amount", "数量")}
              </label>
              <input
                required
                min={1}
                step={1}
                type="number"
                value={transferQuota}
                onChange={(event) => setTransferQuota(event.target.value)}
                placeholder={t("Quota", "额度")}
                className="w-full bg-transparent border-b border-[#121110]/20 focus:border-[#121110] py-2 text-body font-mono text-[#121110] outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={transferring}
              className="w-full bg-inverse text-[#FAFAFA] py-3 text-micro font-mono uppercase tracking-[0.2em] hover:bg-black transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {transferring && (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              )}
              {transferring
                ? t("Transferring...", "转入中...")
                : t("Transfer to Balance", "转入主余额")}
              {!transferring && (
                <ChevronRight className="w-4 h-4 stroke-[1.5] group-hover:translate-x-1 transition-transform" />
              )}
            </button>
            {info && <p className="text-[12px] text-[#121110]">{info}</p>}
          </form>
        </div>

        {/* Right: groups / permissions summary */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif text-[#121110]">
              {t("Group & Permissions", "分组与权限")}
            </h3>
            <Users className="w-4 h-4 text-[#121110]/40" strokeWidth={1.5} />
          </div>

          <div className="border border-[#121110]/10 bg-white shadow-[0_4px_24px_rgb(0,0,0,0.02)]">
            {groupsLoading ? (
              <p className="p-8 text-[12px] text-muted">
                {t("Loading groups...", "正在加载分组...")}
              </p>
            ) : groupEntries.length === 0 ? (
              <p className="p-8 text-[12px] text-muted">
                {t("No groups available.", "暂无可用分组。")}
              </p>
            ) : (
              <ul className="divide-y divide-[#121110]/5">
                {groupEntries.map(([name, info]) => {
                  const isCurrent = name.toLowerCase() === currentGroup;
                  return (
                    <li
                      key={name}
                      className={`flex items-start justify-between gap-4 p-6 ${isCurrent ? "bg-inverse/5" : ""}`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <Layers
                          className={`w-4 h-4 mt-1 shrink-0 ${isCurrent ? "text-[#121110]" : "text-[#121110]/40"}`}
                          strokeWidth={1.5}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-label text-[#121110] truncate">
                              {name}
                            </p>
                            {isCurrent && (
                              <span className="text-overline font-mono uppercase tracking-widest text-[#FAFAFA] bg-inverse px-2 py-0.5">
                                {t("Current", "当前")}
                              </span>
                            )}
                          </div>
                          {info?.desc && (
                            <p className="mt-1 text-[12px] text-muted leading-relaxed">
                              {info.desc}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-overline font-mono uppercase tracking-[0.2em] text-muted">
                          {t("Ratio", "倍率")}
                        </p>
                        <p className="mt-1 font-mono text-label text-[#121110]">
                          {formatRatio(info?.ratio as number | string)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
