import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CreditCard,
  Globe,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sliders,
  Sparkles,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

type Option = { key: string; value: string };

type Section = {
  id: string;
  title: { en: string; zh: string };
  description: { en: string; zh: string };
  icon: typeof Settings2;
  match: (key: string) => boolean;
};

const SECTIONS: Section[] = [
  {
    id: "site",
    title: { en: "Site & Branding", zh: "站点与品牌" },
    description: {
      en: "Public-facing identity: name, logo, footer, notice, and home content.",
      zh: "面向公众的身份：名称、Logo、页脚、公告与首页内容。",
    },
    icon: Globe,
    match: (k) =>
      /^(SystemName|SiteName|Logo|HomePageLink|Footer|Notice|HomePageContent|ServerAddress|ServerInfo|ServerName|theme\.|i18n\.|lang\.|Language)/i.test(
        k,
      ),
  },
  {
    id: "auth",
    title: { en: "Authentication", zh: "认证" },
    description: {
      en: "Registration, OAuth providers, email/2FA/passkey, and verification.",
      zh: "注册、第三方登录、邮箱/2FA/通行密钥与验证码。",
    },
    icon: KeyRound,
    match: (k) =>
      /^(RegisterEnabled|PasswordRegisterEnabled|EmailVerificationEnabled|EmailDomain|EmailDomainRestrictionEnabled|GitHubOAuth|GitHubClientId|LinuxDOOAuth|discord|oidc|WeChatAuth|TelegramAuth|Turnstile|Passkey|TwoFactor|2fa|Login|Auth|Token|Verification|SMTP)/i.test(
        k,
      ),
  },
  {
    id: "billing",
    title: { en: "Billing & Payment", zh: "计费与支付" },
    description: {
      en: "Top-up options, payment gateways (Stripe, EPay, Creem, Waffo), quotas, and pricing.",
      zh: "充值选项、支付渠道（Stripe、EPay、Creem、Waffo）、额度与计费。",
    },
    icon: CreditCard,
    match: (k) =>
      /^(Payment|Topup|Stripe|Creem|Waffo|EPay|Epay|epay|Quota|Ratio|Price|Currency|ModelPrice|GroupRatio|ImageRatio|AudioRatio|CompletionRatio|CacheRatio|VideoRatio|Invite|QuotaForInviter|QuotaForInvitee|Subscription|payment|GENERAL_SETTING\.(QUOTA|CUSTOM_CURRENCY)|BILLING_SETTING\.|GROUP_RATIO_SETTING\.|TOOL_PRICE_SETTING\.)/i.test(
        k,
      ),
  },
  {
    id: "content",
    title: { en: "Content & Compliance", zh: "内容与合规" },
    description: {
      en: "User agreement, privacy policy, about page, sensitive words, and audit hooks.",
      zh: "用户协议、隐私政策、关于、敏感词与审计。",
    },
    icon: Sparkles,
    match: (k) =>
      /^(UserAgreement|PrivacyPolicy|About|Home|Sensitive|Audit|Log|IpBlack|IpWhite|Check|Drawing|Search)/i.test(
        k,
      ),
  },
  {
    id: "operations",
    title: { en: "Operations", zh: "运维" },
    description: {
      en: "Performance, logging, cache, GC, and maintenance toggles.",
      zh: "性能、日志、缓存、GC 与维护开关。",
    },
    icon: Sliders,
    match: (k) =>
      /^(Performance|LogClean|DiskCache|GC|Timeout|Retry|Update|Version|Debug|Metrics|Uptime|Monitor|Stats|RatioSync|ChannelAffinity|Memory|Reload|TaskClean|SystemTask|DataExport|PERF_METRICS_SETTING\.|CONSOLE_SETTING\.|GENERAL_SETTING\.(PING|DOCS|FAQ))/i.test(
        k,
      ),
  },
  {
    id: "security",
    title: { en: "Security", zh: "安全" },
    description: {
      en: "Rate limiting, status-code retry, fingerprint, and key/permission policies.",
      zh: "限流、状态码重试、指纹与密钥/权限策略。",
    },
    icon: ShieldCheck,
    match: (k) =>
      /^(RateLimit|StatusCode|Retry|Fingerprint|Key|ApiKey|Secret|CORS|AllowedOrigin|Csrf|Encryption|Filter|Banned|Block|Sensitive|FETCH_SETTING\.|MODELREQUESTRATELIMIT|AUTOMATICDISABLE|AUTOMATICENABLE|STOPONSENSITIVE|GLOBAL\.(PASS_THROUGH|THINKING_MODEL_BLACKLIST)|CHANNEL_AFFINITY_SETTING\.)/i.test(
        k,
      ),
  },
];

const UNCLASSIFIED_ID = "__other__";

function isBooleanOption(value: string) {
  return value === "true" || value === "false";
}

function isReadOnlyOption(key: string) {
  return key === "CompletionRatioMeta";
}

function classify(key: string) {
  for (const section of SECTIONS) {
    if (section.match(key)) return section.id;
  }
  return UNCLASSIFIED_ID;
}

export default function SystemSettings() {
  const { t } = useLang();
  const location = useLocation();
  const [options, setOptions] = useState<Option[]>([]);
  const [baseline, setBaseline] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [actionOutput, setActionOutput] = useState<unknown>(null);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const section = location.pathname.split("/")[2] || "site";
    const validSection = SECTIONS.some((item) => item.id === section);
    setActiveSection(validSection ? section : "site");
  }, [location.pathname]);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await api.get<Option[]>("/option/");
      const next = Array.isArray(items) ? items : [];
      setOptions(next);
      setBaseline(Object.fromEntries(next.map((item) => [item.key, item.value])));
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load system options.", "无法加载系统配置。"),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  async function saveOption(option: Option) {
    if (baseline[option.key] === option.value) return;
    setSavingKey(option.key);
    setSavedKey(null);
    setError(null);
    try {
      await api.updateOption(option.key, option.value);
      setSavedKey(option.key);
      setBaseline((current) => ({ ...current, [option.key]: option.value }));
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("Unable to save system option.", "无法保存系统配置。"),
      );
    } finally {
      setSavingKey(null);
    }
  }

  async function runAction(name: string, task: () => Promise<unknown>) {
    setAction(name);
    setError(null);
    try {
      setActionOutput(await task());
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("System action failed.", "系统操作失败。"),
      );
    } finally {
      setAction(null);
    }
  }

  const grouped = useMemo(() => {
    const out: Record<string, Option[]> = {};
    for (const section of SECTIONS) out[section.id] = [];
    out[UNCLASSIFIED_ID] = [];
    for (const opt of options) {
      const id = classify(opt.key);
      out[id].push(opt);
    }
    return out;
  }, [options]);

  const visibleOptions = useMemo(() => {
    const list = grouped[activeSection] ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.key.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [grouped, activeSection, search]);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const section of SECTIONS)
      counts[section.id] = grouped[section.id]?.length ?? 0;
    counts[UNCLASSIFIED_ID] = grouped[UNCLASSIFIED_ID]?.length ?? 0;
    return counts;
  }, [grouped]);

  const allSections: Section[] = useMemo(
    () => [
      ...SECTIONS,
      {
        id: UNCLASSIFIED_ID,
        title: { en: "Unclassified", zh: "未分类" },
        description: {
          en: "Options that don't match any section pattern.",
          zh: "未匹配到任何分区规则的配置项。",
        },
        icon: Settings2,
        match: () => false,
      },
    ],
    [],
  );

  return (
    <PageContainer
      title={t("System Parameters", "系统参数")}
      subtitle={t(
        "Configure values published by the server.",
        "配置服务端公开的系统参数。",
      )}
      isLoading={loading}
      error={error}
      onRetry={loadOptions}
    >
      <section className="border border-[#121110]/10 bg-white p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] md:p-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#121110]/10 pb-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Settings2
              className="mt-1 h-5 w-5 text-[#121110]"
              strokeWidth={1.5}
            />
            <div>
              <h2 className="font-serif text-2xl text-[#121110]">
                {t("System Operations", "系统运维操作")}
              </h2>
              <p className="mt-2 text-[12px] text-muted">
                {t(
                  "Run maintenance commands that affect the entire gateway.",
                  "执行影响整个网关的维护命令。",
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={action !== null}
              onClick={() =>
                void runAction("compliance", () =>
                  api.confirmPaymentCompliance(),
                )
              }
              className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              {action === "compliance"
                ? t("Working...", "处理中...")
                : t("Confirm payments", "确认支付合规")}
            </button>
            <button
              type="button"
              disabled={action !== null}
              onClick={() =>
                void runAction("cache", () => api.channelAffinityCache())
              }
              className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              {t("Cache stats", "缓存统计")}
            </button>
            <button
              type="button"
              disabled={action !== null}
              onClick={() =>
                void runAction("clear-cache", () =>
                  api.clearChannelAffinityCache(),
                )
              }
              className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              {t("Clear cache", "清理缓存")}
            </button>
            <button
              type="button"
              disabled={action !== null}
              onClick={() =>
                void runAction("ratio", () => api.resetModelRatio())
              }
              className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              {t("Reset ratios", "重置倍率")}
            </button>
            <button
              type="button"
              disabled={action !== null}
              onClick={() =>
                void runAction("migrate", () => api.migrateConsoleSetting())
              }
              className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              {action === "migrate"
                ? t("Working...", "处理中...")
                : t("Migrate console settings", "迁移控制台配置")}
            </button>
            <button
              type="button"
              disabled={action !== null}
              onClick={() =>
                void runAction("waffo", () => api.waffoPancakeCatalog())
              }
              className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              {t("Probe Waffo", "探测 Waffo")}
            </button>
          </div>
        </div>
        {actionOutput !== null && (
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all border border-[#121110]/10 bg-primary p-4 font-mono text-caption">
            {JSON.stringify(actionOutput, null, 2)}
          </pre>
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav className="self-start border border-[#121110]/10 bg-white p-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <ul className="space-y-1">
            {allSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const count = sectionCounts[section.id] ?? 0;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`flex w-full items-start gap-3 border-l-2 px-3 py-2 text-left transition-colors ${
                      isActive
                        ? "border-[#121110] bg-primary"
                        : "border-transparent hover:bg-primary"
                    }`}
                  >
                    <Icon
                      className={`mt-0.5 h-4 w-4 ${isActive ? "text-[#121110]" : "text-muted"}`}
                      strokeWidth={1.5}
                    />
                    <span className="flex-1">
                      <span
                        className={`block text-[12px] ${isActive ? "font-semibold text-[#121110]" : "text-[#121110]/80"}`}
                      >
                        {t(section.title.en, section.title.zh)}
                      </span>
                      <span className="mt-0.5 block text-caption text-muted">
                        {t(section.description.en, section.description.zh)}
                      </span>
                    </span>
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center border border-[#121110]/10 px-1 text-overline font-mono">
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="min-w-0 border border-[#121110]/10 bg-white p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] md:p-8">
          <div className="mb-6 flex flex-col gap-3 border-b border-[#121110]/10 pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-serif text-xl text-[#121110]">
                {t(
                  allSections.find((s) => s.id === activeSection)?.title.en ??
                    "",
                  allSections.find((s) => s.id === activeSection)?.title.zh ??
                    "",
                )}
              </h3>
              <p className="mt-1 text-caption text-muted">
                {t(
                  allSections.find((s) => s.id === activeSection)?.description
                    .en ?? "",
                  allSections.find((s) => s.id === activeSection)?.description
                    .zh ?? "",
                )}
              </p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Filter by key or value", "按 key 或 value 过滤")}
              className="w-full border-b border-[#121110]/20 bg-transparent px-2 py-2 text-[12px] outline-none focus:border-[#121110] md:max-w-xs"
            />
          </div>

          {visibleOptions.length === 0 ? (
            <p className="py-12 text-center text-[12px] text-muted">
              {t(
                "No editable options in this section.",
                "此分区暂无可编辑配置。",
              )}
            </p>
          ) : (
            <div className="space-y-5">
              {visibleOptions.map((option) => (
                <div
                  key={option.key}
                  className="flex flex-col gap-3 border-b border-[#121110]/10 pb-5 md:flex-row md:items-end"
                >
                  {isReadOnlyOption(option.key) && (
                    <span className="text-overline font-mono uppercase text-muted">
                      {t("Read-only", "只读")}
                    </span>
                  )}
                  <label className="flex-1 space-y-2">
                    <span className="block break-all text-overline font-mono uppercase tracking-widest text-muted">
                      {option.key}
                    </span>
                    {isBooleanOption(option.value) ? (
                      <input
                        type="checkbox"
                        checked={option.value === "true"}
                        onChange={(event) => {
                          setSavedKey(null);
                          setOptions((current) =>
                            current.map((item) =>
                              item.key === option.key
                                ? {
                                    ...item,
                                    value: String(event.target.checked),
                                  }
                                : item,
                            ),
                          );
                        }}
                        className="h-4 w-4 accent-[#121110]"
                      />
                    ) : (
                      <input
                        value={option.value}
                        readOnly={isReadOnlyOption(option.key)}
                        onChange={(event) => {
                          if (isReadOnlyOption(option.key)) return;
                          setSavedKey(null);
                          setOptions((current) =>
                            current.map((item) =>
                              item.key === option.key
                                ? { ...item, value: event.target.value }
                                : item,
                            ),
                          );
                        }}
                        className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-label outline-none focus:border-[#121110]"
                      />
                    )}
                  </label>
                  <button
                    type="button"
                    disabled={savingKey === option.key || isReadOnlyOption(option.key) || baseline[option.key] === option.value}
                    onClick={() => void saveOption(option)}
                    className="flex items-center justify-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase hover:border-[#121110] disabled:opacity-50"
                  >
                    {savingKey === option.key
                      ? t("Saving...", "保存中...")
                      : savedKey === option.key
                        ? t("Saved", "已保存")
                        : t("Save", "保存")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
