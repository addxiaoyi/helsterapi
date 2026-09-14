import { useCallback, useEffect, useState } from "react";
import { Cloud, RefreshCw, Trash2, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/ui/PageContainer";
import { api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { SelectMenu } from "../../components/ui/SelectMenu";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type Deployment = Record<string, unknown> & {
  id?: string | number;
  deployment_name?: string;
  status?: string;
};

export default function Deployments() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [items, setItems] = useState<Deployment[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState({
    name: "",
    duration: "1",
    gpus: "1",
    hardware: "",
    locations: "",
    image: "",
    replicas: "1",
  });
  const [hardwareOptions, setHardwareOptions] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [locationOptions, setLocationOptions] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [replicaInfo, setReplicaInfo] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [config, page] = await Promise.all([
        api.deploymentSettings(),
        search.trim()
          ? api.searchDeployments(1, search.trim())
          : api.deployments(),
      ]);
      setSettings(config);
      setItems(Array.isArray(page.items) ? (page.items as Deployment[]) : []);
      if (config.can_connect) {
        const [hardware, locations] = await Promise.all([
          api.deploymentHardware(),
          api.deploymentLocations(),
        ]);
        setHardwareOptions(
          Array.isArray(hardware.hardware_types)
            ? (hardware.hardware_types as Array<Record<string, unknown>>)
            : [],
        );
        setLocationOptions(
          Array.isArray(locations.locations)
            ? (locations.locations as Array<Record<string, unknown>>)
            : [],
        );
      }
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load deployments.", "无法加载部署。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [search, t, toast]);
  useEffect(() => {
    void load();
  }, [load]);
  async function testConnection() {
    setMessage(null);
    setError(null);
    try {
      const result = await api.testDeploymentConnection();
      setMessage(JSON.stringify(result));
      toast.success({ message: t("Connection tested", "连接测试完成") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Connection test failed.", "连接测试失败。");
      setError(message);
      toast.error({ message });
    }
  }
  async function remove(item: Deployment) {
    if (item.id === undefined) return;
    const ok = await confirm({
      title: t("Delete deployment", "删除部署"),
      description: t(
        "Delete this deployment? This cannot be undone.",
        "确定删除此部署？此操作不可恢复。",
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteDeployment(String(item.id));
      toast.success({ message: t("Deleted", "已删除") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to delete deployment.", "无法删除部署。");
      setError(message);
      toast.error({ message });
    }
  }
  async function rename(item: Deployment) {
    if (item.id === undefined) return;
    const name = await confirm({
      title: t("Rename deployment", "重命名部署"),
      description: t("New deployment name", "新的部署名称"),
      input: {
        label: t("New name", "新名称"),
        type: "text",
        initialValue: item.deployment_name ?? "",
      },
    });
    if (!name?.trim()) return;
    try {
      await api.renameDeployment(String(item.id), name.trim());
      toast.success({ message: t("Renamed", "已重命名") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to rename deployment.", "无法重命名部署。");
      setError(message);
      toast.error({ message });
    }
  }
  async function extend(item: Deployment) {
    if (item.id === undefined) return;
    const raw = await confirm({
      title: t("Extend deployment", "延长部署"),
      description: t("Hours to extend", "延长小时数"),
      input: {
        label: t("Hours", "小时"),
        type: "number",
        min: 1,
        initialValue: "1",
      },
    });
    const hours = Number(raw);
    if (!raw || !Number.isFinite(hours) || hours <= 0) return;
    try {
      await api.extendDeployment(String(item.id), hours);
      toast.success({ message: t("Extended", "已延长") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to extend deployment.", "无法延长部署。");
      setError(message);
      toast.error({ message });
    }
  }
  async function showContainers(item: Deployment) {
    if (item.id === undefined) return;
    try {
      const data = await api.deploymentContainers(String(item.id));
      setMessage(JSON.stringify(data));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load containers.", "无法加载容器。");
      setError(message);
      toast.error({ message });
    }
  }
  async function checkName() {
    const name = createForm.name.trim();
    if (!name) return;
    setError(null);
    try {
      setMessage(JSON.stringify(await api.checkDeploymentName(name)));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to check deployment name.", "无法检查部署名称。");
      setError(message);
      toast.error({ message });
    }
  }
  async function checkReplicas() {
    const hardwareId = Number(createForm.hardware);
    const gpuCount = Number(createForm.gpus);
    if (!Number.isInteger(hardwareId) || hardwareId <= 0 || gpuCount <= 0) return;
    setError(null);
    try {
      setReplicaInfo(await api.availableReplicas(hardwareId, gpuCount));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to check available replicas.", "无法检查可用副本数。");
      setError(message);
      toast.error({ message });
    }
  }
  async function estimatePrice() {
    const hardwareId = Number(createForm.hardware);
    if (!Number.isInteger(hardwareId) || hardwareId <= 0) return;
    setError(null);
    try {
      setMessage(JSON.stringify(await api.estimateDeploymentPrice({
        hardware_id: hardwareId,
        gpu_count: Number(createForm.gpus),
        duration_hours: Number(createForm.duration),
        replica_count: Number(createForm.replicas),
        location_ids: createForm.locations.split(",").map(Number).filter(Number.isFinite),
      })));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to estimate deployment price.", "无法估算部署价格。");
      setError(message);
      toast.error({ message });
    }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.createDeployment({
        resource_private_name: createForm.name.trim(),
        duration_hours: Number(createForm.duration),
        gpus_per_container: Number(createForm.gpus),
        hardware_id: Number(createForm.hardware),
        location_ids: createForm.locations
          .split(",")
          .map(Number)
          .filter(Number.isFinite),
        container_config: { replica_count: Number(createForm.replicas) },
        registry_config: { image_url: createForm.image.trim() },
      });
      setMessage(t("Deployment creation requested.", "已提交部署创建请求。"));
      toast.success({ message: t("Deployment created", "部署已创建") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to create deployment.", "无法创建部署。");
      setError(message);
      toast.error({ message });
    }
  }
  return (
    <PageContainer
      title={t("Model Deployments", "模型部署")}
      subtitle={t(
        "Manage io.net model deployment resources.",
        "管理 io.net 模型部署资源。",
      )}
      isLoading={loading}
      error={error}
      onRetry={load}
    >
      {settings && (
        <div className="mb-6 flex flex-wrap gap-6 border border-[#121110]/10 bg-white p-5 text-micro font-mono">
          <span>
            {t("Provider", "供应商")}: {String(settings.provider ?? "-")}
          </span>
          <span>
            {t("Enabled", "已启用")}: {String(settings.enabled ?? false)}
          </span>
          <span>
            {t("Configured", "已配置")}: {String(settings.configured ?? false)}
          </span>
        </div>
      )}
      <div className="mb-4 flex gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("Search deployments", "搜索部署")}
          className="w-full max-w-sm border-b border-[#121110]/20 bg-transparent px-2 py-2 text-[12px] outline-none focus:border-[#121110]"
        />
      </div>
      <form
        onSubmit={create}
        className="mb-6 border border-[#121110]/10 bg-white p-5"
      >
        <h2 className="mb-4 font-serif text-xl">
          {t("Create deployment", "创建部署")}
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            required
            placeholder={t("Name", "名称")}
            value={createForm.name}
            onChange={(event) =>
              setCreateForm({ ...createForm, name: event.target.value })
            }
            className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
          />
          <input
            required
            type="number"
            min="1"
            placeholder={t("Hours", "小时")}
            value={createForm.duration}
            onChange={(event) =>
              setCreateForm({ ...createForm, duration: event.target.value })
            }
            className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
          />
          <input
            required
            type="number"
            min="1"
            placeholder={t("GPUs/container", "每容器 GPU")}
            value={createForm.gpus}
            onChange={(event) =>
              setCreateForm({ ...createForm, gpus: event.target.value })
            }
            className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
          />
          <SelectMenu value={createForm.hardware} onChange={(value) => setCreateForm({ ...createForm, hardware: value })} options={[{ value: "", label: t("Select hardware", "选择硬件") }, ...hardwareOptions.map((item) => ({ value: String(item.id), label: String(item.name ?? item.hardware_name ?? item.id) }))]} />
          <SelectMenu value={createForm.locations} onChange={(value) => setCreateForm({ ...createForm, locations: value })} options={[{ value: "", label: t("Select location", "选择地域") }, ...locationOptions.map((item) => ({ value: String(item.id), label: String(item.name ?? item.location_name ?? item.id) }))]} />
          <input
            required
            placeholder={t("Image URL", "镜像地址")}
            value={createForm.image}
            onChange={(event) =>
              setCreateForm({ ...createForm, image: event.target.value })
            }
            className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
          />
          <input
            required
            type="number"
            min="1"
            placeholder={t("Replicas", "副本数")}
            value={createForm.replicas}
            onChange={(event) =>
              setCreateForm({ ...createForm, replicas: event.target.value })
            }
            className="border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void checkName()}
            disabled={!createForm.name.trim()}
            className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-40"
          >
            {t("Check name", "检查名称")}
          </button>
          <button
            type="button"
            onClick={() => void checkReplicas()}
            disabled={!createForm.hardware}
            className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-40"
          >
            {t("Check capacity", "检查容量")}
          </button>
          <button
            type="button"
            onClick={() => void estimatePrice()}
            disabled={!createForm.hardware || !createForm.locations}
            className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-40"
          >
            {t("Estimate price", "估算价格")}
          </button>
          <button
            type="submit"
            disabled={
              !Boolean(settings?.can_connect) || hardwareOptions.length === 0
            }
            className="bg-inverse px-4 py-2 text-overline font-mono uppercase text-white disabled:opacity-40"
          >
            {t("Create", "创建")}
          </button>
        </div>
        {replicaInfo !== null && (
          <pre className="mt-4 max-h-32 overflow-auto whitespace-pre-wrap break-all border border-[#121110]/10 bg-primary p-3 text-micro font-mono">
            {JSON.stringify(replicaInfo, null, 2)}
          </pre>
        )}
      </form>
      <div className="mb-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("Refresh", "刷新")}
        </button>
        <button
          type="button"
          onClick={() => void testConnection()}
          className="flex items-center gap-2 bg-inverse px-4 py-2 text-overline font-mono uppercase text-white"
        >
          <Wifi className="h-3.5 w-3.5" />
          {t("Test connection", "测试连接")}
        </button>
      </div>
      {message && (
        <p className="mb-5 border-l-2 border-green-700 bg-green-50 p-3 text-[12px] text-green-800">
          {message}
        </p>
      )}
      {items.length === 0 ? (
        <p className="border border-[#121110]/10 bg-white p-12 text-center text-[12px] text-muted">
          {t("No deployments returned.", "暂无部署数据。")}
        </p>
      ) : (
        <div className="overflow-x-auto border border-[#121110]/10 bg-white">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-[#121110]/10 text-overline font-mono uppercase text-muted">
              <tr>
                <th className="p-4">{t("Name", "名称")}</th>
                <th className="p-4">{t("Status", "状态")}</th>
                <th className="p-4">{t("Hardware", "硬件")}</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={String(item.id)}
                  className="border-b border-[#121110]/10"
                >
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/deployments/${String(item.id)}`)
                      }
                      className="underline underline-offset-4"
                    >
                      {item.deployment_name ?? String(item.id ?? "-")}
                    </button>
                  </td>
                  <td className="p-4 font-mono">{item.status ?? "-"}</td>
                  <td className="p-4">{String(item.hardware_info ?? "-")}</td>
                  <td className="flex flex-wrap gap-3 p-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/deployments/${String(item.id)}`)
                      }
                      className="text-[#121110]"
                    >
                      {t("Details", "详情")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void showContainers(item)}
                      className="text-[#121110]"
                    >
                      {t("Containers", "容器")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void rename(item)}
                      title={t("Rename", "重命名")}
                      className="text-[#121110]"
                    >
                      {t("Rename", "改名")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void extend(item)}
                      title={t("Extend", "续期")}
                      className="text-[#121110]"
                    >
                      {t("Extend", "续期")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(item)}
                      title={t("Delete", "删除")}
                      className="text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-5 flex items-center gap-2 text-caption text-muted">
        <Cloud className="h-4 w-4" />
        {t(
          "Creation and extension require provider configuration and are exposed after the service is configured.",
          "创建和续期需要先配置供应商，服务配置完成后可继续操作。",
        )}
      </div>
    </PageContainer>
  );
}
