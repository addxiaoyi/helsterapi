import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Box,
  Pause,
  Play,
  RefreshCw,
  ScrollText,
  Trash2,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type ContainerSummary = {
  id?: string;
  container_id?: string;
  name?: string;
  status?: string;
  state?: string;
  image?: string;
  created_at?: number;
};

type LogEntry = { ts: number; text: string };

const POLL_INTERVAL_MS = 4000;

function pickContainerId(record: ContainerSummary): string | null {
  return record.id ?? record.container_id ?? null;
}

function extractLogText(payload: unknown): string {
  if (payload === null || payload === undefined) return "";
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) {
    return payload
      .map((line) => (typeof line === "string" ? line : JSON.stringify(line)))
      .join("\n");
  }
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.content === "string") return obj.content;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.log === "string") return obj.log;
    if (Array.isArray(obj.logs)) {
      return obj.logs
        .map((line) => (typeof line === "string" ? line : JSON.stringify(line)))
        .join("\n");
    }
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export default function DeploymentDetails() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [view, setView] = useState<unknown>(null);
  const [containers, setContainers] = useState<ContainerSummary[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const [containerDetail, setContainerDetail] = useState<unknown>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tailActive, setTailActive] = useState(false);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const seenLogRef = useRef<string>("");
  const [updateForm, setUpdateForm] = useState({ imageUrl: "", trafficPort: "", command: "", args: "", entrypoint: "", envVariables: "", secretEnvVariables: "", registryUsername: "", registrySecret: "" });
  const [updating, setUpdating] = useState(false);

  const loadDeployment = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setView(await api.deploymentDetails(id));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load deployment.", "无法加载部署详情。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [id, t, toast]);

  const loadContainers = useCallback(async () => {
    if (!id) return;
    try {
      const payload = await api.deploymentContainers(id);
      let list: ContainerSummary[] = [];
      if (Array.isArray(payload)) {
        list = payload as ContainerSummary[];
      } else if (payload && typeof payload === "object") {
        const obj = payload as Record<string, unknown>;
        const candidate =
          (Array.isArray(obj.containers) && obj.containers) ||
          (Array.isArray(obj.items) && obj.items) ||
          null;
        if (candidate) list = candidate as ContainerSummary[];
      }
      setContainers(list);
      setSelectedContainer((current) => {
        if (current && list.some((c) => pickContainerId(c) === current))
          return current;
        const first = list
          .map((c) => pickContainerId(c))
          .find((cid): cid is string => Boolean(cid));
        return first ?? "";
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load containers.", "无法加载容器。");
      setError(message);
      toast.error({ message });
    }
  }, [id, t, toast]);

  const fetchLogs = useCallback(
    async (append: boolean) => {
      if (!id || !selectedContainer) return;
      try {
        const payload = await api.deploymentLogs(id, selectedContainer);
        const text = extractLogText(payload);
        if (text === seenLogRef.current) return;
        seenLogRef.current = text;
        const ts = Date.now();
        if (append) {
          setLogs((current) => {
            const next: LogEntry[] = [
              ...current,
              { ts, text },
            ];
            return next.slice(-50);
          });
        } else {
          setLogs([{ ts, text }]);
        }
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : t("Unable to load container logs.", "无法加载容器日志。");
        setError(message);
        toast.error({ message });
      }
    },
    [id, selectedContainer, t, toast],
  );

  useEffect(() => {
    void loadDeployment();
  }, [loadDeployment]);

  useEffect(() => {
    void loadContainers();
  }, [loadContainers]);

  useEffect(() => {
    setLogs([]);
    seenLogRef.current = "";
    if (!id || !selectedContainer) return;
    void fetchLogs(false);
  }, [id, selectedContainer, fetchLogs]);

  useEffect(() => {
    if (!tailActive || !id || !selectedContainer) return;
    const handle = window.setInterval(() => {
      void fetchLogs(true);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [tailActive, id, selectedContainer, fetchLogs]);

  useEffect(() => {
    if (!logScrollRef.current) return;
    logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
  }, [logs]);

  const containerItems = useMemo(
    () => containers.map((c) => ({ ...c, _id: pickContainerId(c) ?? "" })),
    [containers],
  );

  async function deleteDeployment() {
    const ok = await confirm({
      title: t("Delete deployment", "删除部署"),
      description: t(
        "Delete this deployment permanently?",
        "确定永久删除该部署吗？",
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteDeployment(id);
      toast.success({ message: t("Deleted", "已删除") });
      navigate("/deployments");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to delete deployment.", "无法删除部署。");
      setError(message);
      toast.error({ message });
    }
  }

  async function showContainerDetail(containerId: string) {
    try {
      setContainerDetail(await api.containerDetails(id, containerId));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to load container details.", "无法加载容器详情。");
      setError(message);
      toast.error({ message });
    }
  }

  async function updateDeployment() {
    const payload: Record<string, unknown> = {};
    if (updateForm.imageUrl.trim()) payload.image_url = updateForm.imageUrl.trim();
    if (updateForm.trafficPort.trim()) {
      const port = Number(updateForm.trafficPort);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        setError(t("Traffic port must be between 1 and 65535.", "流量端口必须在 1 到 65535 之间。"));
        return;
      }
      payload.traffic_port = port;
    }
    if (updateForm.command.trim()) payload.command = updateForm.command.trim();
    if (updateForm.args.trim()) payload.args = updateForm.args.split("\n").map((arg) => arg.trim()).filter(Boolean);
    if (updateForm.entrypoint.trim()) payload.entrypoint = updateForm.entrypoint.split("\n").map((arg) => arg.trim()).filter(Boolean);
    for (const [text, field, label] of [[updateForm.envVariables, "env_variables", "environment variables"], [updateForm.secretEnvVariables, "secret_env_variables", "secret environment variables"]] as const) {
      if (!text.trim()) continue;
      try {
        const parsed = JSON.parse(text);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("object required");
        payload[field] = parsed;
      } catch {
        setError(t(`Invalid ${label} JSON.`, `${label === "environment variables" ? "环境变量" : "密钥环境变量"} JSON 无效。`));
        return;
      }
    }
    if (updateForm.registryUsername.trim()) payload.registry_username = updateForm.registryUsername.trim();
    if (updateForm.registrySecret.trim()) payload.registry_secret = updateForm.registrySecret;
    if (Object.keys(payload).length === 0) {
      setError(t("Enter at least one deployment field.", "请至少填写一个部署字段。"));
      return;
    }
    setUpdating(true);
    setError(null);
    try {
      await api.updateDeployment(id, payload);
      setUpdateForm({ imageUrl: "", trafficPort: "", command: "", args: "", entrypoint: "", envVariables: "", secretEnvVariables: "", registryUsername: "", registrySecret: "" });
      await loadDeployment();
      toast.success({ message: t("Deployment updated", "部署已更新") });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to update deployment.", "无法更新部署。");
      setError(message);
      toast.error({ message });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <PageContainer
      title={t("Deployment Details", "部署详情")}
      subtitle={`${t("Deployment ID", "部署 ID")}: ${id}`}
      isLoading={loading}
      error={error}
      onRetry={loadDeployment}
      actions={
        <>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("Back", "返回")}
          </button>
          <button
            type="button"
            onClick={() => void loadDeployment()}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("Refresh", "刷新")}
          </button>
          <button
            type="button"
            onClick={() => void loadContainers()}
            className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
          >
            <Box className="h-3.5 w-3.5" />
            {t("Containers", "容器列表")}
          </button>
          <div className="ml-4 h-5 w-px bg-inverse/20" />
          <button
            type="button"
            onClick={() => void deleteDeployment()}
            className="flex items-center gap-2 border border-red-900/20 px-4 py-2 text-overline font-mono uppercase text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("Delete deployment", "删除部署")}
          </button>
        </>
      }
    >

      <section className="mb-6 border border-[#121110]/10 bg-white p-5">
        <h3 className="mb-3 font-serif text-lg">{t("Update deployment", "更新部署")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={updateForm.imageUrl} onChange={(event) => setUpdateForm({ ...updateForm, imageUrl: event.target.value })} placeholder={t("Image URL", "镜像地址")} className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none" />
          <input value={updateForm.trafficPort} onChange={(event) => setUpdateForm({ ...updateForm, trafficPort: event.target.value })} placeholder={t("Traffic port", "流量端口")} type="number" min="1" max="65535" className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none" />
          <input value={updateForm.command} onChange={(event) => setUpdateForm({ ...updateForm, command: event.target.value })} placeholder={t("Command", "命令")} className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none" />
          <textarea value={updateForm.args} onChange={(event) => setUpdateForm({ ...updateForm, args: event.target.value })} placeholder={t("Arguments, one per line", "参数，每行一个")} className="min-h-20 border border-[#121110]/20 bg-transparent p-2 text-sm outline-none" />
          <textarea value={updateForm.entrypoint} onChange={(event) => setUpdateForm({ ...updateForm, entrypoint: event.target.value })} placeholder={t("Entrypoint, one per line", "Entrypoint，每行一个")} className="min-h-20 border border-[#121110]/20 bg-transparent p-2 text-sm outline-none" />
          <textarea value={updateForm.envVariables} onChange={(event) => setUpdateForm({ ...updateForm, envVariables: event.target.value })} placeholder={t("Environment variables JSON", "环境变量 JSON")} className="min-h-20 border border-[#121110]/20 bg-transparent p-2 text-sm outline-none" />
          <textarea value={updateForm.secretEnvVariables} onChange={(event) => setUpdateForm({ ...updateForm, secretEnvVariables: event.target.value })} placeholder={t("Secret environment variables JSON", "密钥环境变量 JSON")} className="min-h-20 border border-[#121110]/20 bg-transparent p-2 text-sm outline-none" />
          <input value={updateForm.registryUsername} onChange={(event) => setUpdateForm({ ...updateForm, registryUsername: event.target.value })} placeholder={t("Registry username", "仓库用户名")} className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none" />
          <input type="password" value={updateForm.registrySecret} onChange={(event) => setUpdateForm({ ...updateForm, registrySecret: event.target.value })} placeholder={t("Registry secret", "仓库密钥")} className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none" />
        </div>
        <button type="button" disabled={updating} onClick={() => void updateDeployment()} className="mt-4 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-40">{updating ? t("Updating...", "更新中...") : t("Update", "更新")}</button>
      </section>

      <section className="mb-6 border border-[#121110]/10 bg-white p-5">
        <h3 className="mb-3 flex items-center gap-2 font-serif text-lg">
          <ScrollText className="h-4 w-4" />
          {t("Containers", "容器")}
        </h3>
        {containerItems.length === 0 ? (
          <p className="text-[12px] text-muted">
            {t("No containers reported.", "未返回容器列表。")}
          </p>
        ) : (
          <ul className="divide-y divide-[#121110]/5">
            {containerItems.map((c) => (
              <li
                key={c._id}
                className={`flex flex-wrap items-center justify-between gap-3 py-2 text-[12px] ${
                  selectedContainer === c._id ? "bg-primary" : ""
                }`}
              >
                <div>
                  <p className="font-mono text-[12px]">
                    {c.name ?? c._id}
                  </p>
                  <p className="text-caption text-muted">
                    {c.status ?? c.state ?? "-"}
                    {c.image ? ` · ${c.image}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedContainer(c._id)}
                  className={`border px-3 py-1 text-overline font-mono uppercase ${
                    selectedContainer === c._id
                      ? "border-[#121110] bg-inverse text-[#FAFAFA]"
                      : "border-[#121110]/20 text-[#121110] hover:border-[#121110]"
                  }`}
                >
                  {selectedContainer === c._id
                    ? t("Selected", "已选中")
                    : t("Select", "选择")}
                </button>
                <button
                  type="button"
                  onClick={() => void showContainerDetail(c._id)}
                  className="border border-[#121110]/20 px-3 py-1 text-overline font-mono uppercase text-[#121110] hover:border-[#121110]"
                >
                  {t("Details", "详情")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {containerDetail !== null && (
        <section className="mb-6 border border-[#121110]/10 bg-white p-5">
          <h3 className="mb-3 font-serif text-lg">{t("Container details", "容器详情")}</h3>
          <pre className="max-h-[24rem] overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
            {JSON.stringify(containerDetail, null, 2)}
          </pre>
        </section>
      )}

      <section className="border border-[#121110]/10 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-serif text-lg">
            <ScrollText className="h-4 w-4" />
            {t("Container logs", "容器日志")}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchLogs(false)}
              className="flex items-center gap-2 border border-[#121110]/20 px-3 py-1.5 text-overline font-mono uppercase"
            >
              {t("Fetch", "拉取")}
            </button>
            <button
              type="button"
              onClick={() => setTailActive((active) => !active)}
              className={`flex items-center gap-2 border px-3 py-1.5 text-overline font-mono uppercase ${
                tailActive
                  ? "border-[#121110] bg-inverse text-[#FAFAFA]"
                  : "border-[#121110]/20 text-[#121110] hover:border-[#121110]"
              }`}
              disabled={!selectedContainer}
            >
              {tailActive ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {tailActive ? t("Stop tailing", "停止跟踪") : t("Start tailing", "开始跟踪")}
            </button>
            <button
              type="button"
              onClick={() => {
                setLogs([]);
                seenLogRef.current = "";
              }}
              className="border border-[#121110]/20 px-3 py-1.5 text-overline font-mono uppercase"
            >
              {t("Clear", "清空")}
            </button>
          </div>
        </div>
        <div
          ref={logScrollRef}
          className="max-h-[36rem] min-h-[16rem] overflow-auto whitespace-pre-wrap break-all border border-[#121110]/10 bg-dark p-4 font-mono text-caption leading-relaxed text-[#FAFAFA]/90"
        >
          {logs.length === 0 ? (
            <p className="text-[#FAFAFA]/50">
              {selectedContainer
                ? t(
                    "No log output yet. Press \"Fetch\" or \"Start tailing\".",
                    "暂无日志输出。可点击“拉取”或“开始跟踪”。",
                  )
                : t("Select a container first.", "请先选择一个容器。")}
            </p>
          ) : (
            logs.map((entry) => (
              <div key={entry.ts} className="border-b border-[#FAFAFA]/5 py-1">
                <span className="text-[#FAFAFA]/40">
                  [{new Date(entry.ts).toLocaleTimeString()}]{" "}
                </span>
                {entry.text}
              </div>
            ))
          )}
        </div>
      </section>

      {view !== null && (
        <section className="mt-6 border border-[#121110]/10 bg-white p-5">
          <h3 className="mb-3 font-serif text-lg">
            {t("Raw metadata", "原始元数据")}
          </h3>
          <pre className="max-h-[40rem] overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
            {JSON.stringify(view, null, 2)}
          </pre>
        </section>
      )}
    </PageContainer>
  );
}
