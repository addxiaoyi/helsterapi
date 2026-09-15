import React, { useEffect, useRef, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import { ShieldCheck, Fingerprint, Github } from "lucide-react";
import { useApp } from "../../lib/AppContext";
import { useLang } from "../../lib/LanguageContext";
import { ApiError, api } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { useNavigate } from "react-router-dom";

function readNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export default function Profile() {
  const { user, refreshUser } = useApp();
  const { t } = useLang();
  const toast = useToast();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(
    user?.display_name || user?.username || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [bindings, setBindings] = useState<
    Awaited<ReturnType<typeof api.oauthBindings>>
  >([]);
  const [bindingsLoading, setBindingsLoading] = useState(true);
  const [unbinding, setUnbinding] = useState<number | null>(null);
  const [checkin, setCheckin] = useState<{
    enabled: boolean;
    min_quota: number;
    max_quota: number;
    stats: {
      total_quota: number;
      total_checkins: number;
      checkin_count: number;
      checked_in_today: boolean;
      records: Array<{ checkin_date: string; quota_awarded: number }>;
    };
  }>();
  const [checkinSaving, setCheckinSaving] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setDisplayName(user?.display_name || user?.username || "");
  }, [user?.display_name, user?.username]);

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);
    void Promise.allSettled([
      api.twoFactorStatus(),
      api.passkeyStatus(),
      api.oauthBindings(),
      api.status(),
    ])
      .then(([statusResult, passkeyResult, bindingsResult, serviceResult]) => {
        if (statusResult.status === "fulfilled") {
          setTwoFactorEnabled(statusResult.value.enabled);
        } else {
          console.error(
            "Unable to load two-factor status",
            statusResult.reason,
          );
        }
        if (passkeyResult.status === "fulfilled") {
          setPasskeyEnabled(passkeyResult.value.enabled);
        } else {
          console.error("Unable to load passkey status", passkeyResult.reason);
        }
        if (bindingsResult.status === "fulfilled") {
          setBindings(
            Array.isArray(bindingsResult.value) ? bindingsResult.value : [],
          );
        } else {
          console.error("Unable to load OAuth bindings", bindingsResult.reason);
        }
        if (serviceResult.status === "fulfilled") {
          setTurnstileEnabled(Boolean(serviceResult.value.turnstile_check));
          setTurnstileSiteKey(serviceResult.value.turnstile_site_key ?? "");
        }
      })
      .finally(() => setBindingsLoading(false));
    void api
      .checkinStatus(month)
      .then(setCheckin)
      .catch((cause) => {
        console.error("Unable to load check-in status", cause);
        setCheckinError(
          cause instanceof ApiError
            ? cause.message
            : t("Unable to load check-in status.", "签到状态加载失败。"),
        );
        setCheckin(undefined);
      });
  }, [t]);

  useEffect(() => {
    if (!turnstileEnabled || !turnstileSiteKey || !turnstileRef.current) return;
    type Turnstile = {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string | number;
      reset?: (id: string | number) => void;
    };
    const win = window as Window & { turnstile?: Turnstile };
    let widgetId: string | number | undefined;
    const render = () => {
      if (!win.turnstile || !turnstileRef.current) return;
      widgetId = win.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: setTurnstileToken,
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    };
    const existing = document.querySelector(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    if (win.turnstile) render();
    else if (existing)
      existing.addEventListener("load", render, { once: true });
    else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      if (widgetId !== undefined) win.turnstile?.reset?.(widgetId);
    };
  }, [turnstileEnabled, turnstileSiteKey]);

  async function unbind(providerId: number) {
    setUnbinding(providerId);
    setError(null);
    try {
      await api.unbindOAuth(providerId);
      setBindings((current) =>
        current.filter((binding) => binding.provider_id !== providerId),
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("Unable to disconnect account.", "无法断开账户连接。"),
      );
    } finally {
      setUnbinding(null);
    }
  }

  async function doCheckin() {
    if (turnstileEnabled && !turnstileToken) {
      setError(t("Complete the security check first.", "请先完成安全验证。"));
      return;
    }
    setCheckinSaving(true);
    setError(null);
    try {
      const result = await api.checkin(turnstileToken || undefined);
      setTurnstileToken("");
      const month = new Date().toISOString().slice(0, 7);
      setCheckin(await api.checkinStatus(month));
      await refreshUser();
      toast.success({
        message: t(
          `Check-in completed. +${readNumber(result.quota_awarded).toLocaleString()} quota.`,
          `签到成功，获得 ${readNumber(result.quota_awarded).toLocaleString()} 额度。`,
        ),
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("Unable to check in.", "签到失败。"),
      );
    } finally {
      setCheckinSaving(false);
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = displayName.trim();
    if (!value) {
      setError(t("Display name is required.", "显示名称不能为空。"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.updateSelf({ display_name: value });
      await refreshUser();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("Unable to update profile.", "无法更新个人资料。"),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <PageContainer
      title={t("Identity & Security", "身份与安全")}
      subtitle={t(
        "Manage your personal profile, connected accounts, and security protocols.",
        "管理您的个人资料、关联账户及安全协议。",
      )}
    >
      {" "}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-5">
        {" "}
        <div className="space-y-4">
          {" "}
          <div className="border border-[#121110]/10 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-8">
            {" "}
            <h3 className="text-xl font-serif text-[#121110] mb-6">
              {t("Profile Settings", "个人资料设置")}
            </h3>{" "}
            <form onSubmit={saveProfile} className="space-y-4">
              {" "}
              <div className="space-y-2">
                {" "}
                <label className="text-overline font-mono uppercase tracking-[0.2em] text-muted">
                  {t("Display Name", "显示名称")}
                </label>{" "}
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full bg-white border border-[#121110]/10 focus:border-[#121110] focus:ring-1 focus:ring-[#121110] py-2.5 px-3 text-body text-[#121110] outline-none transition-all duration-300 ease-out-expo shadow-sm focus:shadow-md rounded-none"
                />{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <label className="text-overline font-mono uppercase tracking-[0.2em] text-muted">
                  {t("Email Address", "电子邮箱")}
                </label>{" "}
                <input
                  type="email"
                  value={user?.email ?? ""}
                  className="w-full bg-white border border-[#121110]/10 focus:border-[#121110] focus:ring-1 focus:ring-[#121110] py-2.5 px-3 text-body text-[#121110] outline-none transition-all duration-300 ease-out-expo shadow-sm focus:shadow-md rounded-none opacity-70"
                  readOnly
                />{" "}
              </div>{" "}
              <button
                type="submit"
                disabled={saving}
                className="bg-transparent border border-[#121110]/20 text-[#121110] px-6 py-2.5 mt-4 text-overline font-mono uppercase tracking-widest rounded-none disabled:opacity-50"
              >
                {" "}
                {saving
                  ? t("Saving...", "保存中...")
                  : t("Update Identity", "更新资料")}{" "}
              </button>{" "}
              {error && <p className="text-[12px] text-red-600">{error}</p>}
            </form>{" "}
          </div>{" "}
          <div className="border border-[#121110]/10 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-8">
            <h3 className="mb-6 text-xl font-serif">
              {t("Daily Check-in", "每日签到")}
            </h3>
            {checkin?.enabled ? (
              <>
                <div className="mb-5 grid grid-cols-2 gap-4 text-[12px]">
                  <div>
                    <p className="text-muted">{t("This month", "本月次数")}</p>
                    <p className="mt-1 font-mono text-lg">
                      {checkin.stats.checkin_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">
                      {t("Total awarded", "累计获得")}
                    </p>
                    <p className="mt-1 font-mono text-lg">
                      {checkin.stats.total_quota}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">
                      {t("Daily reward", "每日奖励范围")}
                    </p>
                    <p className="mt-1 font-mono text-lg">
                      {readNumber(checkin.min_quota).toLocaleString()} -{" "}
                      {readNumber(checkin.max_quota).toLocaleString()}
                    </p>
                  </div>
                </div>
                {checkin.stats.records.length > 0 && (
                  <div className="mb-5 border-t border-[#121110]/10 pt-4">
                    <p className="mb-3 text-overline font-mono uppercase tracking-widest text-muted">
                      {t("This month history", "本月签到记录")}
                    </p>
                    <div className="max-h-32 space-y-2 overflow-y-auto text-[12px]">
                      {checkin.stats.records.map((record) => (
                        <div
                          key={record.checkin_date}
                          className="flex items-center justify-between border-b border-[#121110]/5 pb-2 font-mono"
                        >
                          <span className="text-muted">
                            {record.checkin_date}
                          </span>
                          <span className="text-[#121110]">
                            +{readNumber(record.quota_awarded).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {turnstileEnabled && turnstileSiteKey && (
                  <div ref={turnstileRef} className="mb-4 min-h-[65px]" />
                )}
                <button
                  type="button"
                  onClick={() => void doCheckin()}
                  disabled={checkin.stats.checked_in_today || checkinSaving}
                  className="bg-inverse px-6 py-2.5 text-overline font-mono uppercase tracking-widest text-white disabled:opacity-40"
                >
                  {checkin.stats.checked_in_today
                    ? t("Checked in today", "今日已签到")
                    : checkinSaving
                      ? t("Checking in...", "签到中...")
                      : t("Check in", "立即签到")}
                </button>
              </>
            ) : checkinError ? (
              <div className="space-y-3 text-[12px] text-red-700">
                <p>{checkinError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="underline underline-offset-2"
                >
                  {t("Retry", "重试")}
                </button>
              </div>
            ) : (
              <p className="text-[12px] text-muted">
                {t("Check-in is unavailable.", "签到功能不可用。")}
              </p>
            )}
          </div>{" "}
          <div className="border border-[#121110]/10 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-8">
            {" "}
            <h3 className="text-xl font-serif text-[#121110] mb-6">
              {t("OAuth Connections", "OAuth 授权连接")}
            </h3>{" "}
            {bindingsLoading ? (
              <p className="text-[12px] text-muted">
                {t("Loading connections...", "正在加载连接...")}
              </p>
            ) : bindings.length === 0 ? (
              <p className="text-[12px] text-muted">
                {t("No connected accounts.", "暂无已连接账户。")}
              </p>
            ) : (
              bindings.map((binding) => (
                <div
                  key={binding.provider_id}
                  className="flex items-center justify-between border-b border-[#121110]/10 pb-4"
                >
                  <div className="flex items-center gap-4">
                    <Github className="h-5 w-5 text-[#121110] stroke-1" />
                    <div>
                      <p className="text-label text-[#121110]">
                        {binding.provider_name}
                      </p>
                      <p className="text-micro font-mono text-muted">
                        {binding.provider_user_id}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={unbinding === binding.provider_id}
                    onClick={() => void unbind(binding.provider_id)}
                    className="text-overline font-mono uppercase tracking-widest text-red-600 disabled:opacity-50"
                  >
                    {unbinding === binding.provider_id
                      ? t("Disconnecting...", "断开中...")
                      : t("Disconnect", "断开连接")}
                  </button>
                </div>
              ))
            )}
          </div>{" "}
        </div>{" "}
        <div className="space-y-8">
          {" "}
          <div className="border border-[#121110]/10 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-8">
            {" "}
            <div className="flex items-center gap-3 mb-6">
              {" "}
              <ShieldCheck className="w-5 h-5 text-[#121110] stroke-1" />{" "}
              <h3 className="text-xl font-serif text-[#121110]">
                {t("Two-Factor Authentication", "双重认证 (2FA)")}
              </h3>{" "}
            </div>{" "}
            <p className="text-label text-muted mb-6">
              Enhance your account security by requiring a second authentication
              step.
            </p>{" "}
            <div className="bg-inverse/5 p-4 flex items-center justify-between mb-6">
              {" "}
              <span className="text-micro font-mono uppercase tracking-widest text-[#121110]">
                Status
              </span>{" "}
              <span
                className={`text-micro font-mono uppercase tracking-widest ${twoFactorEnabled ? "text-[#121110]" : "text-red-600"}`}
              >
                {twoFactorEnabled
                  ? t("Enabled", "已启用")
                  : t("Disabled", "未启用")}
              </span>{" "}
            </div>{" "}
            <button
              type="button"
              onClick={() => navigate("/security")}
              className="bg-inverse text-[#FAFAFA] px-6 py-2.5 text-overline font-mono uppercase tracking-widest rounded-none"
            >
              {" "}
              {t("Configure 2FA", "配置 2FA")}{" "}
            </button>{" "}
          </div>{" "}
          <div className="border border-[#121110]/10 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-8">
            {" "}
            <div className="flex items-center gap-3 mb-6">
              {" "}
              <Fingerprint className="w-5 h-5 text-[#121110] stroke-1" />{" "}
              <h3 className="text-xl font-serif text-[#121110]">
                {t("Passkeys", "通行密钥")}
              </h3>{" "}
            </div>{" "}
            <p className="text-label text-muted mb-6">
              {t(
                "Use a registered device to authenticate without a password.",
                "使用已注册设备进行免密码认证。",
              )}
            </p>{" "}
            <div className="mb-5 flex items-center justify-between bg-inverse/5 p-4">
              <span className="text-micro font-mono uppercase tracking-widest text-[#121110]">
                {t("Status", "状态")}
              </span>
              <span
                className={`text-micro font-mono uppercase tracking-widest ${passkeyEnabled ? "text-[#121110]" : "text-red-600"}`}
              >
                {passkeyEnabled
                  ? t("Registered", "已注册")
                  : t("Not registered", "未注册")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/security")}
              className="bg-transparent border border-[#121110]/20 text-[#121110] px-6 py-2.5 text-overline font-mono uppercase tracking-widest rounded-none"
            >
              {" "}
              {passkeyEnabled
                ? t("Manage Device", "管理设备")
                : t("Register Device", "注册设备")}{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </PageContainer>
  );
}
