import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Activity } from "lucide-react";
import { PublicFooter } from "../../components/ui/PublicFooter";
import { useLang } from "../../lib/LanguageContext";
import { api, type ApiStatus } from "../../lib/api";
import { DonutChart } from "../../components/charts";

function itemText(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export default function PublicHome() {
  const navigate = useNavigate();
  const { t } = useLang();
  const gridRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    ApiStatus & {
      register_enabled?: boolean;
      password_register_enabled?: boolean;
    }
  >({});
  const [statusError, setStatusError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [homeContent, setHomeContent] = useState<string | null>(null);
  const [uptimeConfigured, setUptimeConfigured] = useState<boolean | null>(
    null,
  );
  const [channelHealth, setChannelHealth] = useState<
    { label: string; value: number; color: string }[]
  >([]);
  const trafficPulse: number[] = [];
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.status(), api.notice(), api.homePageContent()])
      .then(([serviceStatus, announcement, configuredContent]) => {
        setStatus(serviceStatus);
        const text =
          typeof announcement === "string"
            ? announcement
            : String((announcement as { content?: unknown })?.content ?? "");
        setNotice(text || null);
        const content =
          typeof configuredContent === "string"
            ? configuredContent
            : String(
                (configuredContent as { content?: unknown })?.content ?? "",
              );
        setHomeContent(content || null);
        if (serviceStatus.uptime_kuma_enabled === false) {
          setUptimeConfigured(false);
          return;
        }
        return api
          .uptimeStatus()
          .then((uptime) =>
            setUptimeConfigured(Array.isArray(uptime) && uptime.length > 0),
          );
      })
      .catch(() => setStatusError(true));
    // Telemetry is additive, but failures must remain visible as failures.
    Promise.resolve({ items: [] as never[] })
      .then((res) => {
        const items = res.items ?? [];
        const buckets: Record<string, number> = {
          Operational: 0,
          Degraded: 0,
          Offline: 0,
        };
        for (const channel of items) {
          if (channel.status === 1) buckets.Operational += 1;
          else if (channel.status === 2) buckets.Degraded += 1;
          else buckets.Offline += 1;
        }
        const palette = ["var(--chart-3)", "var(--chart-5)", "var(--chart-8)"];
        setChannelHealth(
          [
            { key: "Operational", label: t("Operational", "运行中"), value: buckets.Operational, color: palette[0] },
            { key: "Degraded", label: t("Degraded", "降级"), value: buckets.Degraded, color: palette[1] },
            { key: "Offline", label: t("Offline", "离线"), value: buckets.Offline, color: palette[2] },
          ].filter((d) => d.value > 0),
        );
      })
      .catch((cause) => {
        console.error("Unable to load public channel telemetry", cause);
        setTelemetryError(
          cause instanceof Error
            ? cause.message
            : t("Unable to load channel telemetry.", "无法加载渠道遥测数据。"),
        );
      });
    void Promise.resolve().catch((cause) => {
      console.error("Unable to load public traffic telemetry", cause);
      setTelemetryError(
        cause instanceof Error
          ? cause.message
          : t("Unable to load traffic telemetry.", "无法加载流量遥测数据。"),
      );
    });
    const onScroll = () => {
      if (gridRef.current)
        gridRef.current.style.transform = `translateY(${window.scrollY * 0.15}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [t]);

  const metrics = [
    ...(notice ? [{ label: t("Notice", "公告"), value: notice }] : []),
    {
      label: t("System", "系统"),
      value: status.system_name || t("Unavailable", "不可用"),
    },
    {
      label: t("Version", "版本"),
      value: status.version || t("Unavailable", "不可用"),
    },
    {
      label: t("Endpoint", "接口状态"),
      value: statusError
        ? t("Unavailable", "不可用")
        : status.server_address
          ? t("Configured", "已配置")
          : t("Unavailable", "不可用"),
    },
    {
      label: t("Registration", "注册"),
      value: statusError
        ? t("Unavailable", "不可用")
        : status.register_enabled === false ||
            status.password_register_enabled === false
          ? t("Closed", "已关闭")
          : t("Open", "已开放"),
    },
    {
      label: t("Monitors", "监控状态"),
      value:
        uptimeConfigured === null
          ? t("Unavailable", "不可用")
          : uptimeConfigured
            ? t("Configured", "已配置")
            : t("Not configured", "未配置"),
    },
  ];
  const registrationEnabled =
    status.register_enabled !== false &&
    status.password_register_enabled !== false;

  return (
    <div className="paper-liquid-surface relative min-h-screen overflow-hidden selection:bg-inverse selection:text-[#FAFAFA]">
      <div
        ref={gridRef}
        className="pointer-events-none absolute inset-0 bg-grid-pattern"
      />
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1400px] flex-col justify-center px-6 pb-24 pt-32 md:px-12 lg:px-24">
        <div className="grid grid-cols-1 items-end gap-12 lg:grid-cols-12">
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-300 lg:col-span-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="h-px w-12 bg-inverse/40" />
              <span className="text-overline font-mono uppercase tracking-[0.3em] text-[#121110]/50">
                {status.system_name || t("Gateway", "网关")}
              </span>
            </div>
            <h1 className="text-6xl font-serif font-medium leading-[0.95] tracking-tight text-[#121110] sm:text-7xl md:text-8xl lg:text-[100px]">
              {t("Orchestrating", "编排")}
              <br />
              <span className="italic text-[#121110]/70">
                {t("Intelligence.", "智能。")}
              </span>
            </h1>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-300 delay-300 lg:col-span-4">
            <p className="mb-8 text-justify text-body leading-relaxed text-muted">
              {t(
                "A unified gateway for routing, authentication, and telemetry across AI providers.",
                "统一管理 AI 供应商路由、认证与遥测的网关。",
              )}{" "}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row lg:flex-col xl:flex-row">
              <button
                onClick={() =>
                  navigate(registrationEnabled ? "/register" : "/login")
                }
                className="group flex w-full items-center justify-between gap-6 bg-inverse px-6 py-4 text-white shadow-button transition-all hover:bg-black active:scale-[0.98] sm:w-auto"
              >
                <span className="text-caption font-bold uppercase tracking-[0.15em]">
                  {registrationEnabled
                    ? t("Enter OS", "进入系统")
                    : t("Sign In", "登录")}
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="w-full border border-[#121110]/10 px-6 py-4 text-caption font-bold uppercase tracking-[0.15em] text-[#121110] transition-all hover:border-[#121110]/40 sm:w-auto"
              >
                {t("Explore Models", "探索模型")}
              </button>
            </div>
          </div>
        </div>
        {homeContent && (
          <section className="mt-16 border-y border-[#121110]/10 bg-white px-6 py-8 text-label leading-relaxed text-[#121110] whitespace-pre-wrap">
            {homeContent}
          </section>
        )}
        {status.announcements_enabled !== false &&
          status.announcements &&
          status.announcements.length > 0 && (
            <section className="mt-16 border-y border-[#121110]/10 bg-white px-6 py-8">
              <h2 className="mb-6 font-serif text-2xl text-[#121110]">
                {t("Announcements", "系统公告")}
              </h2>
              <div className="space-y-5">
                {status.announcements.map((item, index) => {
                  const content = itemText(item, ["content", "title"]);
                  const extra = itemText(item, ["extra", "description"]);
                  return (
                    <article
                      key={`${content}-${index}`}
                      className="border-l-2 border-[#121110]/20 pl-4"
                    >
                      <p className="text-label leading-relaxed text-[#121110]">
                        {content || t("Announcement", "公告")}
                      </p>
                      {extra && (
                        <p className="mt-1 text-[12px] leading-relaxed text-muted">
                          {extra}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        {status.faq_enabled !== false &&
          status.faq &&
          status.faq.length > 0 && (
            <section className="mt-16 border-y border-[#121110]/10 bg-white px-6 py-8">
              <h2 className="mb-6 font-serif text-2xl text-[#121110]">FAQ</h2>
              <div className="grid gap-5 md:grid-cols-2">
                {status.faq.map((item, index) => {
                  const question = itemText(item, ["question", "title"]);
                  const answer = itemText(item, ["answer", "content"]);
                  return (
                    <details
                      key={`${question}-${index}`}
                      className="border-b border-[#121110]/10 pb-4"
                    >
                      <summary className="cursor-pointer text-label font-medium text-[#121110]">
                        {question || t("Question", "问题")}
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap text-[12px] leading-relaxed text-muted">
                        {answer}
                      </p>
                    </details>
                  );
                })}
              </div>
            </section>
          )}
        {status.api_info_enabled !== false &&
          status.api_info &&
          status.api_info.length > 0 && (
            <section className="mt-16 border-y border-[#121110]/10 bg-white px-6 py-8">
              <h2 className="mb-6 font-serif text-2xl text-[#121110]">
                {t("API Information", "接口信息")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {status.api_info.map((item, index) => {
                  const title = itemText(item, ["title", "name", "label"]);
                  const value = itemText(item, [
                    "value",
                    "content",
                    "description",
                    "url",
                  ]);
                  return (
                    <div
                      key={`${title}-${index}`}
                      className="border-b border-[#121110]/10 pb-3"
                    >
                      <p className="text-overline font-mono uppercase tracking-widest text-muted">
                        {title || t("Endpoint", "接口")}
                      </p>
                      <p className="mt-2 break-words text-label text-[#121110]">
                        {value || "-"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        {/* Live gateway telemetry — channel health + traffic pulse.
            Failures are swallowed upstream, so this section is purely
            additive and never blocks the rest of the page. */}
        {(channelHealth.length > 0 || telemetryError) && (
          <section className="mt-16 grid grid-cols-1 gap-px border border-ink/10 bg-ink/5 md:grid-cols-3">
            <div className="flex flex-col gap-4 bg-paper p-6 md:p-8">
              <div className="flex items-center gap-2 text-overline font-mono uppercase tracking-widest text-ink">
                <Activity className="h-3.5 w-3.5" />
                {t("Live gateway", "实时网关")}
              </div>
              <p className="text-caption text-muted">
                {t(
                  "Channel status reflects the configured database state; active probing is not implied.",
                  "渠道状态反映数据库配置状态，不代表已执行探活。",
                )}
              </p>
              {telemetryError && (
                <p className="text-caption text-red-700">{telemetryError}</p>
              )}
              {channelHealth.length > 0 ? (
                <DonutChart
                  segments={channelHealth}
                  size={160}
                  thickness={28}
                  showLegend
                />
              ) : (
                <p className="text-caption text-muted">
                  {t("Loading channel data...", "加载渠道数据中...")}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-4 bg-paper p-6 md:p-8 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-overline font-mono uppercase tracking-widest text-ink">
                  {t("Traffic pulse (24h)", "流量脉冲（24小时）")}
                </span>
                <span className="text-caption font-mono text-muted">
                  {t("12 evenly spaced samples", "12 个均匀采样点")}
                </span>
              </div>
              {trafficPulse.length > 0 ? (
                <div className="flex h-32 items-end gap-2">
                  {trafficPulse.map((value, i) => {
                    const max = Math.max(...trafficPulse, 1);
                    const h = Math.max(2, (value / max) * 100);
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-ink/85 transition-all duration-700"
                        style={{
                          height: `${h}%`,
                          opacity: 0.4 + (value / max) * 0.6,
                        }}
                        title={`${value.toLocaleString()} req`}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-caption text-muted">
                  {t("Awaiting telemetry data.", "等待遥测数据。")}
                </p>
              )}
              <div className="grid grid-cols-3 gap-3 border-t border-ink/10 pt-4 text-caption">
                <div>
                  <span className="block text-overline font-mono uppercase tracking-widest text-muted">
                    {t("Channels", "渠道")}
                  </span>
                  <span className="font-mono text-body-lg text-ink">
                    {channelHealth.reduce((s, d) => s + d.value, 0)}
                  </span>
                </div>
                <div>
                  <span className="block text-overline font-mono uppercase tracking-widest text-muted">
                  {t("Current RPM", "当前 RPM")}
                  </span>
                  <span className="font-mono text-body-lg text-ink">
                    {t("Unavailable", "暂无数据")}
                  </span>
                </div>
                <div>
                  <span className="block text-overline font-mono uppercase tracking-widest text-muted">
                    {t("Status", "状态")}
                  </span>
                  <span className="font-mono text-body-lg text-success">
                    {statusError ? t("Unavailable", "不可用") : t("Operational", "运行中")}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
        <div className="mt-32 grid grid-cols-2 gap-px border-y border-[#121110]/5 bg-inverse/5 md:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex h-32 flex-col justify-between bg-primary p-6 md:p-8"
            >
              <span className="text-overline font-mono uppercase tracking-widest text-muted">
                {metric.label}
              </span>
              <span className="truncate text-xl font-serif text-[#121110]">
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
