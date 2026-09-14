import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Bell,
  Loader2,
  Megaphone,
  RefreshCw,
  Server,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { ApiError, api, type ApiStatus } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type Instance = {
  node_name: string;
  status?: string;
  stale_after_seconds?: number;
  last_seen_at?: number;
};

type UptimeService = {
  name?: string;
  status?: string;
  url?: string;
  type?: string;
};

type UptimePayload = UptimeService[] | { services?: UptimeService[] } | null;

function extractNotice(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.content === "string") return obj.content;
    if (typeof obj.notice === "string") return obj.notice;
    if (typeof obj.message === "string") return obj.message;
  }
  return "";
}

function extractUptime(payload: UptimePayload): UptimeService[] {
  if (Array.isArray(payload)) return payload;
  if (
    payload &&
    Array.isArray((payload as { services?: UptimeService[] }).services)
  ) {
    return (payload as { services: UptimeService[] }).services;
  }
  return [];
}

function statusVariant(status: string | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "up" || s === "operational" || s === "online") {
    return {
      className: "border-green-700 bg-green-50 text-green-700",
      label: "Operational",
    };
  }
  if (s === "degraded" || s === "warning") {
    return {
      className: "border-yellow-600 bg-yellow-50 text-yellow-700",
      label: "Degraded",
    };
  }
  if (s === "down" || s === "offline" || s === "outage") {
    return {
      className: "border-red-700 bg-red-50 text-red-700",
      label: "Outage",
    };
  }
  return {
    className: "border-[#121110]/20 bg-white text-muted",
    label: status || "Unknown",
  };
}

function formatTime(timestamp: number) {
  return timestamp > 0 ? new Date(timestamp * 1000).toLocaleString() : "-";
}

export default function SystemInfo() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [cleaning, setCleaning] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [uptime, setUptime] = useState<UptimeService[]>([]);
  const [statusTestResult, setStatusTestResult] = useState<
    | { ok: boolean; message: string; httpStats?: unknown }
    | null
  >(null);
  const [testing, setTesting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadStatus = useCallback(async () => {
    setError(null);
    try {
      const [currentStatus, nodes, noticePayload, uptimePayload] =
        await Promise.allSettled([
          api.status(),
          api.systemInstances(),
          api.notice(),
          api.uptimeStatus(),
        ]);
      if (currentStatus.status === "fulfilled") setStatus(currentStatus.value);
      if (nodes.status === "fulfilled") setInstances(nodes.value);
      if (noticePayload.status === "fulfilled")
        setNotice(extractNotice(noticePayload.value));
      if (uptimePayload.status === "fulfilled")
        setUptime(extractUptime(uptimePayload.value as UptimePayload));
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load system status.", "无法加载系统状态。");
      setError(message);
      toast.error({ message });
    }
  }, [t, toast]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const handle = window.setInterval(() => {
      void loadStatus();
    }, 10000);
    return () => window.clearInterval(handle);
  }, [autoRefresh, loadStatus]);

  // Ping the gateway and surface the HTTP stats the backend reports. This is
  // a quick way for operators to confirm the data plane is healthy without
  // scraping logs.
  const runStatusTest = useCallback(async () => {
    setTesting(true);
    setStatusTestResult(null);
    try {
      const result = await api.statusTest();
      const data = (result as { http_stats?: unknown; message?: string }) ?? {};
      setStatusTestResult({
        ok: true,
        message:
          typeof data.message === "string"
            ? data.message
            : t("Server is running.", "服务正在运行。"),
        httpStats: data.http_stats,
      });
      toast.success({
        message: t("Self-test passed.", "自检通过。"),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Self-test failed.", "自检失败。");
      setStatusTestResult({ ok: false, message });
      toast.error({ message });
    } finally {
      setTesting(false);
    }
  }, [t, toast]);

  async function clearInstances(nodeName?: string) {
    const ok = await confirm({
      title: t("Clear stale instances", "清理过期实例"),
      description: t(
        "Remove stale instance records?",
        "确定清理过期实例记录吗？",
      ),
      confirmText: t("Clear", "清理"),
      variant: "danger",
    });
    if (!ok) return;
    setCleaning(nodeName ?? "all");
    setError(null);
    try {
      if (nodeName) await api.clearStaleInstance(nodeName);
      else await api.clearStaleInstances();
      toast.success({ message: t("Cleared", "已清理") });
      await loadStatus();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to clean instances.", "无法清理实例。");
      setError(message);
      toast.error({ message });
    } finally {
      setCleaning(null);
    }
  }

  const metrics = [
    [t("System", "系统"), status?.system_name || "-"],
    [t("Version", "版本"), status?.version || "-"],
    [t("Server address", "服务地址"), status?.server_address || "-"],
    [
      t("Started at", "启动时间"),
      status?.start_time ? formatTime(status.start_time) : "-",
    ],
    [
      t("Setup state", "初始化状态"),
      status
        ? status.setup
          ? t("Required", "需要初始化")
          : t("Ready", "已就绪")
        : "-",
    ],
    [
      t("GitHub OAuth", "GitHub 登录"),
      status?.github_oauth ? t("Enabled", "已启用") : t("Disabled", "未启用"),
    ],
    [
      t("Registration", "注册"),
      status?.register_enabled === false
        ? t("Closed", "已关闭")
        : t("Open", "已开放"),
    ],
    [
      t("Password login", "密码登录"),
      status?.password_login_enabled === false
        ? t("Disabled", "未启用")
        : t("Enabled", "已启用"),
    ],
    [
      t("Data export", "数据导出"),
      status?.enable_data_export === false
        ? t("Disabled", "未启用")
        : t("Enabled", "已启用"),
    ],
    [
      t("Self-use mode", "自用模式"),
      status?.self_use_mode_enabled
        ? t("Enabled", "已启用")
        : t("Disabled", "未启用"),
    ],
    [
      t("Demo site mode", "演示站模式"),
      status?.demo_site_enabled
        ? t("Enabled", "已启用")
        : t("Disabled", "未启用"),
    ],
  ];

  return (
    <PageContainer
      title={t("System Information", "系统信息")}
      subtitle={t(
        "Service status, runtime instances, and public notice published by the gateway.",
        "网关公开的服务状态、运行实例和公告。",
      )}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void runStatusTest()}
            disabled={testing}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase text-[#121110] hover:border-[#121110] disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            {t("Self-test", "自检")}
          </button>
          <button
            type="button"
            onClick={() => setAutoRefresh((active) => !active)}
            className={`flex items-center gap-2 border px-4 py-2 text-overline font-mono uppercase ${
              autoRefresh
                ? "border-[#121110] bg-inverse text-[#FAFAFA]"
                : "border-[#121110]/20 text-[#121110] hover:border-[#121110]"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {autoRefresh
              ? t("Stop auto", "停止自动")
              : t("Auto 10s", "10 秒自动")}
          </button>
        </div>
      }
    >
      {notice && (
        <section className="mb-6 flex items-start gap-3 border border-yellow-600 bg-yellow-50 p-4 text-[12px] text-yellow-800">
          <Megaphone className="h-4 w-4 shrink-0" />
          <div className="whitespace-pre-wrap break-words">{notice}</div>
        </section>
      )}

      {statusTestResult && (
        <section
          className={`mb-6 flex items-start gap-3 border p-4 text-[12px] ${
            statusTestResult.ok
              ? "border-green-600 bg-green-50 text-green-800"
              : "border-red-600 bg-red-50 text-red-800"
          }`}
        >
          <Activity
            className={`h-4 w-4 shrink-0 mt-0.5 ${
              statusTestResult.ok ? "" : "text-red-600"
            }`}
          />
          <div className="whitespace-pre-wrap break-words">
            {statusTestResult.message}
            {statusTestResult.httpStats && (
              <pre className="mt-2 overflow-x-auto text-micro">
                {JSON.stringify(statusTestResult.httpStats, null, 2)}
              </pre>
            )}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-px border border-[#121110]/10 bg-inverse/10 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="bg-white p-8">
            <div className="mb-8 flex items-center justify-between">
              <span className="text-overline font-mono uppercase tracking-[0.2em] text-muted">
                {label}
              </span>
              <Server className="h-4 w-4 text-[#121110]" strokeWidth={1} />
            </div>
            <p className="break-words text-xl font-serif text-[#121110]">
              {value}
            </p>
          </div>
        ))}
      </div>

      {uptime.length > 0 && (
        <section className="mt-6 border border-[#121110]/10 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-xl">
            <Activity className="h-4 w-4" />
            {t("Uptime monitors", "Uptime 监控")}
          </h2>
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {uptime.map((service, idx) => {
              const variant = statusVariant(service.status);
              return (
                <li
                  key={`${service.name ?? idx}-${idx}`}
                  className="flex flex-col gap-1 border border-[#121110]/10 p-4"
                >
                  <span className="text-overline font-mono uppercase tracking-widest text-muted">
                    {service.name ?? service.type ?? `Service ${idx + 1}`}
                  </span>
                  <span
                    className={`inline-flex items-center self-start px-2 py-0.5 text-overline font-mono uppercase border ${variant.className}`}
                  >
                    {variant.label}
                  </span>
                  {service.url && (
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-caption text-muted hover:text-[#121110]"
                    >
                      {service.url}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6 border border-[#121110]/10 bg-white p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl">
              {t("Runtime instances", "运行实例")}
            </h2>
            <p className="mt-1 text-[12px] text-muted">
              {t(
                "Nodes reported by the service heartbeat.",
                "服务心跳上报的节点。",
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={cleaning !== null}
            onClick={() => void clearInstances()}
            className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            {t("Clear stale", "清理过期")}
          </button>
        </div>
        {instances.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted">
            {t("No instance records.", "暂无实例记录。")}
          </p>
        ) : (
          <div className="space-y-3">
            {instances.map((instance) => (
              <div
                key={instance.node_name}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[#121110]/10 pb-3"
              >
                <div>
                  <p className="font-mono text-[12px]">{instance.node_name}</p>
                  <p className="text-caption text-muted">
                    {instance.status ?? "-"} ·{" "}
                    {formatTime(instance.last_seen_at ?? 0)}
                  </p>
                </div>
                {instance.status === "stale" && (
                  <button
                    type="button"
                    disabled={cleaning !== null}
                    onClick={() => void clearInstances(instance.node_name)}
                    className="border border-red-900/20 px-3 py-2 text-overline font-mono uppercase text-red-700 disabled:opacity-50"
                  >
                    {t("Remove", "移除")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {status && (
        <section className="mt-6 border border-[#121110]/10 bg-white p-6">
          <h2 className="mb-3 flex items-center gap-2 font-serif text-xl">
            <Shield className="h-4 w-4" />
            {t("Auth & registration", "认证与注册")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                key: "register_enabled",
                label: t("Self-registration", "自助注册"),
                value:
                  status.register_enabled === false
                    ? t("Closed", "已关闭")
                    : t("Open", "已开放"),
              },
              {
                key: "password_register_enabled",
                label: t("Password registration", "密码注册"),
                value:
                  status.password_register_enabled === false
                    ? t("Disabled", "未启用")
                    : t("Enabled", "已启用"),
              },
              {
                key: "github_oauth",
                label: t("GitHub OAuth", "GitHub 登录"),
                value: status.github_oauth
                  ? t("Enabled", "已启用")
                  : t("Disabled", "未启用"),
              },
              {
                key: "password_login_enabled",
                label: t("Password login", "密码登录"),
                value:
                  status.password_login_enabled === false
                    ? t("Disabled", "未启用")
                    : t("Enabled", "已启用"),
              },
              {
                key: "setup",
                label: t("Setup completed", "初始化完成"),
                value: status.setup
                  ? t("Required", "需要初始化")
                  : t("Ready", "已完成"),
              },
            ].map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between border border-[#121110]/10 p-3 text-[12px]"
              >
                <span className="text-overline font-mono uppercase tracking-widest text-muted">
                  {row.label}
                </span>
                <span className="font-mono">{row.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 flex items-center gap-2 text-overline font-mono uppercase tracking-widest text-muted">
        <Sparkles className="h-3 w-3" />
        {t(
          "Notice & uptime loaded from the gateway.",
          "公告与监控数据来自网关。",
        )}
        {error && <span className="ml-auto text-red-700">{error}</span>}
      </section>
    </PageContainer>
  );
}
