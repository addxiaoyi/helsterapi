import React, { useCallback, useEffect, useState } from "react";
import { Bell, Globe, Languages, Save, Trash2, Loader2 } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { SelectMenu } from "../../components/ui/SelectMenu";
import { useApp } from "../../lib/AppContext";

const STORAGE_KEY = "zzznew:user-settings-v1";

type Settings = {
  language: "en" | "zh" | "system";
  theme: "light" | "dark" | "system";
  palette: "paper" | "mist" | "sage";
  font: "manrope" | "serif" | "mono";
  notify_email: boolean;
  notify_low_quota: boolean;
  notify_subscription: boolean;
  default_model: string;
  notify_type: "email" | "webhook" | "bark" | "gotify";
  quota_warning_threshold: string;
  notification_email: string;
  webhook_url: string;
  bark_url: string;
  gotify_url: string;
  gotify_token: string;
  gotify_priority: string;
  disable_leak_protection_balanced: boolean;
};

const DEFAULTS: Settings = {
  language: "system",
  theme: "light",
  palette: "paper",
  font: "manrope",
  notify_email: true,
  notify_low_quota: true,
  notify_subscription: false,
  default_model: "",
  notify_type: "email",
  quota_warning_threshold: "10",
  notification_email: "",
  webhook_url: "",
  bark_url: "",
  gotify_url: "",
  gotify_token: "",
  gotify_priority: "5",
  disable_leak_protection_balanced: false,
};

function readLocal(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

function writeLocal(settings: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function UserSettings() {
  const { t, lang, setLang } = useLang();
  const { user, refreshUser } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const local = readLocal();
    setSettings(local);
    if (local.language === "en" || local.language === "zh") {
      setLang(local.language);
    }
  }, [setLang]);

  useEffect(() => {
    if (!user?.setting) return;
    try {
      const remote = JSON.parse(user.setting) as Partial<Settings>;
      const next = { ...readLocal(), ...remote };
      setSettings(next);
      writeLocal(next);
      if (next.language === "en" || next.language === "zh") {
        setLang(next.language);
      }
    } catch (cause) {
      console.error("Unable to parse server user settings", cause);
    }
  }, [setLang, user?.setting]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      writeLocal(next);
      return next;
    });
    if (key === "language" && (value === "en" || value === "zh")) {
      setLang(value);
    }
    setSaved(false);
    if (key === "theme" || key === "palette" || key === "font") {
      window.dispatchEvent(new Event("zzznew:theme-change"));
    }
  };

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateUserSetting({
        notify_type: settings.notify_type,
        palette: settings.palette,
        font: settings.font,
        quota_warning_threshold: Number(settings.quota_warning_threshold),
        notification_email: settings.notification_email,
        webhook_url: settings.webhook_url,
        gotify_url: settings.gotify_url,
        gotify_token: (settings.gotify_token || "").trim(),
        gotify_priority: Number(settings.gotify_priority),
        bark_url: settings.bark_url,
        disable_leak_protection_balanced:
          settings.disable_leak_protection_balanced,
      });
      if (settings.language === "en" || settings.language === "zh") {
        await api.updateSelf({ language: settings.language });
      }
      writeLocal(settings);
      setSaved(true);
      const message = t(
        "Settings saved and synced to the server.",
        "设置已保存并同步到服务器。",
      );
      toast.success({ message });
      await refreshUser();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to sync settings to server.", "无法同步设置到服务器。");
      setError(message);
      toast.error({ message });
    } finally {
      setSaving(false);
    }
  }, [settings, refreshUser, t, toast]);

  const reset = useCallback(async () => {
    const confirmed = await confirm({
      title: t("Reset settings?", "重置设置？"),
      description: t(
        "This will reset all settings to their defaults on this device.",
        "将把所有设置重置为设备上的默认值。",
      ),
      confirmText: t("Reset", "重置"),
      variant: "danger",
    });
    if (!confirmed) return;
    setSettings(DEFAULTS);
    writeLocal(DEFAULTS);
    setSaved(false);
    toast.success({ message: t("Settings reset.", "设置已重置。") });
  }, [confirm, t, toast]);

  return (
    <PageContainer
      title={t("Account Settings", "账户设置")}
      subtitle={t(
        "Personalize language, theme, default model, and notification preferences. Stored locally and synced to the server when you save.",
        "个性化语言、主题、默认模型和通知偏好。设置保存在本地，保存时会同步到服务器。",
      )}
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void reset()}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase tracking-widest"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("Reset", "重置")}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex items-center gap-2 bg-inverse px-6 py-2 text-overline font-mono uppercase tracking-widest text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? t("Saving...", "保存中...") : t("Save", "保存")}
          </button>
        </div>
      }
    >
      {saved && (
        <div className="mb-6 border-l-2 border-green-700 bg-green-50 px-4 py-2 text-[12px] text-green-800">
          {t(
            "Settings saved and synced to the server.",
            "设置已保存并同步到服务器。",
          )}
        </div>
      )}
      {error && (
        <div className="mb-6 border-l-2 border-red-600 bg-red-50 px-4 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Language + theme */}
        <section className="border border-[#121110]/10 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <Languages className="h-4 w-4 text-muted" />
            <h2 className="font-serif text-lg">
              {t("Language & Theme", "语言与主题")}
            </h2>
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                {t("Language", "语言")}
              </span>
              <SelectMenu value={settings.language} onChange={(value) => update("language", value as Settings["language"])} options={[{ value: "system", label: `${t("Follow browser", "跟随浏览器")} (${lang})` }, { value: "en", label: "English" }, { value: "zh", label: "中文" }]} />
            </label>

            <label className="block">
              <span className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                {t("Theme", "主题")}
              </span>
              <SelectMenu value={settings.palette} onChange={(value) => update("palette", value as Settings["palette"])} options={[{ value: "paper", label: t("Paper", "纸张") }, { value: "mist", label: t("Mist blue", "雾蓝") }, { value: "sage", label: t("Sage green", "鼠尾草") }]} />
            </label>

            <label className="block">
              <span className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                {t("Font", "字体")}
              </span>
              <SelectMenu value={settings.font} onChange={(value) => update("font", value as Settings["font"])} options={[{ value: "manrope", label: "Manrope" }, { value: "serif", label: t("Editorial serif", "编辑衬线") }, { value: "mono", label: t("Technical mono", "技术等宽") }]} />
            </label>
          </div>
        </section>

        {/* Default model */}
        <section className="border border-[#121110]/10 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted" />
            <h2 className="font-serif text-lg">
              {t("Default Model", "默认模型")}
            </h2>
          </div>
          <p className="mb-3 text-[12px] text-muted">
            {t(
              "The model pre-selected when opening a new Playground session.",
              "打开新 Playground 会话时默认选中的模型。",
            )}
          </p>
          <input
            type="text"
            value={settings.default_model}
            onChange={(event) => update("default_model", event.target.value)}
            placeholder={t(
              "e.g. gpt-4o, claude-3-5-sonnet",
              "例如：gpt-4o、claude-3-5-sonnet",
            )}
            className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted/60"
          />
        </section>

        {/* Notifications */}
        <section className="border border-[#121110]/10 bg-white p-6 md:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted" />
            <h2 className="font-serif text-lg">{t("Notifications", "通知")}</h2>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                {t("Notification channel", "通知渠道")}
              </span>
              <SelectMenu value={settings.notify_type} onChange={(value) => update("notify_type", value as Settings["notify_type"])} options={[{ value: "email", label: t("Email", "邮件") }, { value: "webhook", label: "Webhook" }, { value: "bark", label: "Bark" }, { value: "gotify", label: "Gotify" }]} />
            </label>
            <label className="block">
              <span className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                {t("Quota warning threshold", "额度预警阈值")}
              </span>
              <input
                type="number"
                min="0.000001"
                step="0.01"
                value={settings.quota_warning_threshold}
                onChange={(event) =>
                  update("quota_warning_threshold", event.target.value)
                }
                className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
              />
            </label>
            {settings.notify_type === "email" && (
              <label className="block">
                <span className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Notification email", "通知邮箱")}
                </span>
                <input
                  type="email"
                  value={settings.notification_email}
                  onChange={(event) =>
                    update("notification_email", event.target.value)
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
            )}
            {settings.notify_type === "webhook" && (
              <label className="block">
                <span className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                  Webhook URL
                </span>
                <input
                  type="url"
                  value={settings.webhook_url}
                  onChange={(event) =>
                    update("webhook_url", event.target.value)
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
            )}
            {settings.notify_type === "bark" && (
              <label className="block">
                <span className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                  Bark URL
                </span>
                <input
                  type="url"
                  value={settings.bark_url}
                  onChange={(event) => update("bark_url", event.target.value)}
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
            )}
            {settings.notify_type === "gotify" && (
              <>
                <label className="block">
                  <span className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                    Gotify URL
                  </span>
                  <input
                    type="url"
                    value={settings.gotify_url}
                    onChange={(event) =>
                      update("gotify_url", event.target.value)
                    }
                    className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                    Gotify token
                  </span>
                  <input
                    type="password"
                    value={settings.gotify_token}
                    onChange={(event) =>
                      update("gotify_token", event.target.value)
                    }
                    className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                    Gotify priority
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={settings.gotify_priority}
                    onChange={(event) =>
                      update("gotify_priority", event.target.value)
                    }
                    className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                  />
                </label>
              </>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                [
                  "notify_email" as const,
                  t("Account activity", "账户活动"),
                  t(
                    "Receive emails for security events.",
                    "接收安全事件邮件。",
                  ),
                ],
                [
                  "notify_low_quota" as const,
                  t("Low quota warnings", "余额不足提醒"),
                  t(
                    "Alert when your balance drops below 10%.",
                    "余额低于 10% 时提醒。",
                  ),
                ],
                [
                  "notify_subscription" as const,
                  t("Subscription updates", "订阅更新"),
                  t(
                    "Plan changes, renewals, and invoices.",
                    "套餐变更、续费与账单。",
                  ),
                ],
              ] as const
            ).map(([key, en, zh]) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 border border-[#121110]/10 p-3 hover:border-[#121110]/30"
              >
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(event) => update(key, event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#121110]"
                />
                <span className="text-[12px]">
                  <span className="block font-medium">{t(en, zh)}</span>
                  <span className="mt-1 block text-muted">{t(zh, en)}</span>
                </span>
              </label>
            ))}
          </div>
          <label
            className={`mt-4 flex items-start gap-3 border border-[#121110]/10 p-3 ${
              user?.leak_protection_balanced_forced
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:border-[#121110]/30"
            }`}
          >
            <input
              type="checkbox"
              checked={settings.disable_leak_protection_balanced}
              onChange={(event) =>
                update("disable_leak_protection_balanced", event.target.checked)
              }
              disabled={user?.leak_protection_balanced_forced === true}
              className="mt-1 h-4 w-4 accent-[#121110]"
            />
            <span className="text-[12px]">
              <span className="block font-medium">
                {t("Disable balanced leak protection", "关闭平衡防泄漏扫描")}
              </span>
              <span className="mt-1 block text-muted">
                {user?.leak_protection_balanced_forced
                  ? t(
                      "This protection is enforced by the administrator.",
                      "该防护由管理员强制开启。",
                    )
                  : t(
                      "Use this only when your upstream workflow requires it.",
                      "仅在您的上游工作流确实需要时关闭。",
                    )}
              </span>
            </span>
          </label>
        </section>
      </div>

      <p className="mt-6 text-micro font-mono uppercase tracking-widest text-muted">
        {t(
          "Settings auto-save locally. Press Save to sync to the server.",
          "设置会自动保存到本地。按下保存以同步到服务器。",
        )}
      </p>
    </PageContainer>
  );
}
