import { useLang } from "../lib/LanguageContext";
import { useToast } from "../components/ui/Toast";
import { useConfirm } from "../components/ui/ConfirmDialog";
import React, { useCallback, useEffect, useState } from "react";
import { PageContainer } from "../components/ui/PageContainer";
import { DataTable } from "../components/ui/DataTable";
import {
  ChannelEditorModal,
  type ChannelFormState,
} from "./ChannelsEditor";
import {
  Plus,
  Activity,
  RefreshCw,
  Trash2,
  Edit2,
  Copy,
  Eye,
  Play,
  AlertTriangle,
  Network,
  Zap,
} from "lucide-react";
import { api, type ApiChannel } from "../lib/api";
import { SelectMenu } from "../components/ui/SelectMenu";
import { displayChannelName } from "../lib/channelDisplay";

type ChannelRow = Omit<ApiChannel, "models" | "balance"> & {
  groups: string[];
  models: number;
  statusLabel: "Active" | "Disabled";
  autoDisable: boolean;
  balance: string;
  response: string;
  tested: string;
};

function formatChannelTime(value?: number) {
  return value && value > 0 ? new Date(value * 1000).toLocaleString() : "-";
}

export default function Channels() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperating, setIsOperating] = useState(false);
  const [editor, setEditor] = useState<ApiChannel | null | undefined>(
    undefined,
  );
  const [groups, setGroups] = useState<string[]>([]);
  const [channelOps, setChannelOps] = useState<unknown>(null);
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
  const [batchWorking, setBatchWorking] = useState(false);
  const [codexUsage, setCodexUsage] = useState<unknown>(null);
  const [upstreamUpdates, setUpstreamUpdates] = useState<unknown>(null);
  const [tagModels, setTagModels] = useState<unknown>(null);
  const [ollamaChannelId, setOllamaChannelId] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");
  const [ollamaResult, setOllamaResult] = useState<unknown>(null);
  const [multiKeyChannelId, setMultiKeyChannelId] = useState("");
  const [multiKeyAction, setMultiKeyAction] = useState("get_key_status");
  const [multiKeyIndex, setMultiKeyIndex] = useState(0);
  const [multiKeyResult, setMultiKeyResult] = useState<unknown>(null);
  const [channelDetailsResult, setChannelDetailsResult] =
    useState<unknown>(null);
  const [channelTag, setChannelTag] = useState("");
  const [newChannelTag, setNewChannelTag] = useState("");
  const [tagAction, setTagAction] = useState("disable");

  useEffect(() => {
    api
      .userGroups()
      .then((items) => setGroups(Object.keys(items)))
      .catch((cause) => {
        console.error(
          "Unable to load user groups for the channel editor",
          cause,
        );
        setGroups([]);
      });
  }, []);
  useEffect(() => {
    api
      .channelOps()
      .then(setChannelOps)
      .catch(() => setChannelOps(null));
  }, []);
  const loadChannels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.channels(page, search.trim() || undefined, {
        group: groupFilter || undefined,
        status: statusFilter || undefined,
        type: typeFilter ? Number(typeFilter) : undefined,
      });
      setChannels(response.items);
      setTotal(response.total);
    } catch (cause) {
      setChannels([]);
      setTotal(0);
      setError(
        cause instanceof Error
          ? cause.message
          : t("Unable to load channels.", "无法加载渠道。"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [groupFilter, page, search, statusFilter, t, typeFilter]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  const deleteChannel = async (channel: Pick<ApiChannel, "id" | "name">) => {
    const ok = await confirm({
      title: t("Delete Channel", "删除渠道"),
      description: t(
        `Delete channel "${displayChannelName(channel.name)}"? This cannot be undone.`,
        `确定删除渠道 "${displayChannelName(channel.name)}"？此操作不可恢复。`,
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.deleteChannel(channel.id);
      setChannels((current) =>
        current.filter((item) => item.id !== channel.id),
      );
      setTotal((current) => Math.max(0, current - 1));
      toast.success({ message: t("Channel deleted", "渠道已删除") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to delete channel.", "无法删除渠道。");
      setError(message);
      toast.error({ message });
    }
  };

  async function batchOperation(
    ids: string[],
    operation: (ids: number[]) => Promise<unknown>,
    confirmText?: string,
  ) {
    if (ids.length === 0) return;
    if (confirmText) {
      const ok = await confirm({
        title: t("Confirm Batch Operation", "确认批量操作"),
        description: confirmText,
        confirmText: t("Continue", "继续"),
      });
      if (!ok) return;
    }
    setBatchWorking(true);
    setError(null);
    try {
      await operation(ids.map((id) => Number(id)));
      setSelectedIds([]);
      await loadChannels();
      toast.success({
        message: t("Batch operation completed", "批量操作完成"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Batch operation failed.", "批量操作失败。");
      setError(message);
      toast.error({ message });
    } finally {
      setBatchWorking(false);
    }
  }

  function openEditor(channel?: ApiChannel) {
    setEditor(channel ?? null);
  }

  const toggleChannel = async (channel: {
    id: number;
    status: number | string;
  }) => {
    setIsOperating(true);
    setError(null);
    try {
      const isActive = channel.status === 1 || channel.status === "Active";
      await api.updateChannelStatus(channel.id, isActive ? 2 : 1);
      await loadChannels();
      toast.success({
        message: isActive
          ? t("Channel disabled", "渠道已禁用")
          : t("Channel enabled", "渠道已启用"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to update channel status.", "无法更新渠道状态。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const copyChannel = async (channel: Pick<ApiChannel, "id" | "name">) => {
    setIsOperating(true);
    setError(null);
    try {
      await api.copyChannel(channel.id);
      await loadChannels();
      toast.success({
        message: t(
          `Channel "${displayChannelName(channel.name)}" copied`,
          `渠道 "${displayChannelName(channel.name)}" 已复制`,
        ),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to copy channel.", "无法复制渠道。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const showChannelDetails = async (id: number) => {
    setIsOperating(true);
    setError(null);
    try {
      setChannelDetailsResult(await api.channelDetails(id));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load channel details.", "无法加载渠道详情。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const deleteDisabledChannels = async () => {
    const ok = await confirm({
      title: t("Delete disabled channels", "删除已禁用渠道"),
      description: t(
        "Delete every disabled channel? This cannot be undone.",
        "确定删除所有已禁用渠道？此操作不可恢复。",
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    setIsOperating(true);
    setError(null);
    try {
      await api.deleteDisabledChannels();
      await loadChannels();
      toast.success({
        message: t("Disabled channels deleted", "已删除禁用渠道"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to delete disabled channels.", "无法删除禁用渠道。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const testChannelById = async (id: number) => {
    setIsOperating(true);
    setError(null);
    try {
      await api.testChannel(id);
      toast.success({ message: t("Channel test completed", "渠道测试完成") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to test channel.", "无法测试渠道。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const testAllChannels = async () => {
    setIsOperating(true);
    setError(null);
    try {
      await api.testChannel();
      await loadChannels();
      toast.success({ message: t("Channel tests completed", "渠道测试完成") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to test channels.", "无法测试渠道。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const updateAllBalances = async () => {
    setIsOperating(true);
    setError(null);
    try {
      await api.updateChannelBalance();
      await loadChannels();
      toast.success({ message: t("Balances updated", "余额已更新") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to update balances.", "无法更新余额。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const updateChannelBalanceById = async (id: number) => {
    setIsOperating(true);
    setError(null);
    try {
      await api.updateChannelBalance(id);
      await loadChannels();
      toast.success({
        message: t("Channel balance updated", "渠道余额已更新"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to update channel balance.", "无法更新渠道余额。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const detectUpstreamUpdates = async () => {
    setIsOperating(true);
    setError(null);
    try {
      setUpstreamUpdates(await api.detectAllChannelUpstreamUpdates());
      toast.success({
        message: t("Upstream updates checked", "上游更新检查完成"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to check upstream updates.", "无法检查上游更新。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const applyAllUpstreamUpdates = async () => {
    const ok = await confirm({
      title: t("Apply upstream updates", "应用上游更新"),
      description: t(
        "Apply all detected upstream channel updates?",
        "确定应用所有已检测到的上游渠道更新？",
      ),
      confirmText: t("Apply", "应用"),
    });
    if (!ok) return;
    setIsOperating(true);
    setError(null);
    try {
      await api.applyAllChannelUpstreamUpdates();
      await loadChannels();
      toast.success({
        message: t("Upstream updates applied", "上游更新已应用"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to apply upstream updates.", "无法应用上游更新。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const detectUpstreamUpdatesById = async (channelId: string) => {
    setIsOperating(true);
    setError(null);
    try {
      const result = await api.detectChannelUpstreamUpdates({ id: channelId });
      if (result.has_update) {
        toast.success({
          message: t(
            `Update available for channel: ${result.current_version} → ${result.latest_version}`,
            `渠道有新版本可用：${result.current_version} → ${result.latest_version}`
          ),
        });
      } else {
        toast.success({
          message: t(
            `Channel ${result.current_version} is already the latest.`,
            `渠道 ${result.current_version} 已是最新版本。`
          ),
        });
      }
      await loadChannels();
      return result;
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to check upstream updates.", "无法检测上游更新。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const applyUpstreamUpdatesById = async (channelId: string): Promise<void> => {
    const confirmed = await confirm({
      title: t("Apply Upstream Update", "应用上游更新"),
      description: t(
        "This will update the channel to the latest upstream version. Continue?",
        "这将把渠道更新到最新上游版本。继续吗？"
      ),
      confirmText: t("Apply", "应用"),
      cancelText: t("Cancel", "取消"),
    });
    if (!confirmed) return;
    setIsOperating(true);
    setError(null);
    try {
      await api.applyChannelUpstreamUpdates({ id: channelId });
      toast.success({
        message: t("Upstream update applied successfully.", "上游更新应用成功。"),
      });
      await loadChannels();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to apply upstream update.", "无法应用上游更新。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const loadTagModels = async () => {
    setIsOperating(true);
    setError(null);
    try {
      setTagModels(await api.channelTagModels());
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load channel tag models.", "无法加载渠道标签模型。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const fixChannelAbilities = async () => {
    setIsOperating(true);
    setError(null);
    try {
      await api.fixChannelAbilities();
      toast.success({
        message: t("Channel abilities fixed", "渠道能力已修复"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to fix channel abilities.", "无法修复渠道能力。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const runOllamaAction = async (action: "pull" | "delete") => {
    const channelId = Number(ollamaChannelId);
    const modelName = ollamaModel.trim();
    if (!channelId || !modelName) {
      const message = t(
        "Select a channel and enter a model name.",
        "请选择渠道并输入模型名称。",
      );
      setError(message);
      toast.error({ message });
      return;
    }
    setIsOperating(true);
    setError(null);
    try {
      const payload = { channel_id: channelId, model_name: modelName };
      setOllamaResult(
        action === "pull"
          ? await api.ollamaPull(payload)
          : await api.ollamaDelete(payload),
      );
      toast.success({
        message:
          action === "pull"
            ? t("Ollama model pulled", "Ollama 模型已拉取")
            : t("Ollama model deleted", "Ollama 模型已删除"),
      });
      await loadChannels();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to update Ollama model.", "无法更新 Ollama 模型。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const runMultiKeyAction = async () => {
    const channelId = Number(multiKeyChannelId);
    if (!channelId) {
      const message = t("Select a channel.", "请选择渠道。");
      setError(message);
      toast.error({ message });
      return;
    }
    const needsIndex = ["disable_key", "enable_key", "delete_key"].includes(
      multiKeyAction,
    );
    if (needsIndex && multiKeyIndex < 0) {
      const message = t(
        "Key index must be non-negative.",
        "密钥索引不能为负数。",
      );
      setError(message);
      toast.error({ message });
      return;
    }
    setIsOperating(true);
    setError(null);
    try {
      setMultiKeyResult(
        await api.manageChannelKeys({
          channel_id: channelId,
          action: multiKeyAction,
          ...(needsIndex ? { key_index: multiKeyIndex } : {}),
          ...(multiKeyAction === "get_key_status"
            ? { page: 1, page_size: 50 }
            : {}),
        }),
      );
      toast.success({
        message: t("Multi-key operation completed", "多密钥操作完成"),
      });
      if (multiKeyAction !== "get_key_status") await loadChannels();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to manage channel keys.", "无法管理渠道密钥。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const runTagAction = async () => {
    const tag = channelTag.trim();
    if (!tag) {
      const message = t("Enter a channel tag.", "请输入渠道标签。");
      setError(message);
      toast.error({ message });
      return;
    }
    if (tagAction === "edit" && !newChannelTag.trim()) {
      const message = t("Enter the new channel tag.", "请输入新的渠道标签。");
      setError(message);
      toast.error({ message });
      return;
    }
    setIsOperating(true);
    setError(null);
    try {
      if (tagAction === "disable") await api.disableTagChannels(tag);
      else if (tagAction === "enable") await api.enableTagChannels(tag);
      else await api.editChannelTag({ tag, new_tag: newChannelTag.trim() });
      await loadChannels();
      toast.success({ message: t("Channel tag updated", "渠道标签已更新") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to update channel tag.", "无法更新渠道标签。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };
  const setSelectedChannelTag = async () => {
    const tag = channelTag.trim();
    const ids = selectedIds.map(Number).filter(Number.isInteger);
    if (!tag || ids.length === 0) {
      const message = !tag
        ? t("Enter a channel tag.", "请输入渠道标签。")
        : t("Select channels first.", "请先选择渠道。");
      setError(message);
      toast.error({ message });
      return;
    }
    setBatchWorking(true);
    setError(null);
    try {
      await api.batchSetChannelTag({ ids, tag });
      setSelectedIds([]);
      await loadChannels();
      toast.success({
        message: t("Tag applied to selected channels", "已为所选渠道设置标签"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to set channel tags.", "无法设置渠道标签。");
      setError(message);
      toast.error({ message });
    } finally {
      setBatchWorking(false);
    }
  };
  const fetchModelsBatch = async (ids: string[]) => {
    if (ids.length === 0) return;
    setBatchWorking(true);
    setError(null);
    try {
      await api.fetchChannelModelsAll({ ids: ids.map(Number) });
      setSelectedIds([]);
      await loadChannels();
      toast.success({ message: t("Models fetched", "模型抓取完成") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to fetch models.", "无法抓取模型。");
      setError(message);
      toast.error({ message });
    } finally {
      setBatchWorking(false);
    }
  };
  const fetchModelsById = async (id: number) => {
    setIsOperating(true);
    setError(null);
    try {
      await api.fetchChannelModels(id);
      await loadChannels();
      toast.success({
        message: t("Channel models fetched", "渠道模型抓取完成"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to fetch channel models.", "无法抓取渠道模型。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  };

  async function loadCodexUsage(id: number) {
    setIsOperating(true);
    setError(null);
    try {
      setCodexUsage(await api.codexChannelUsage(id));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load Codex usage.", "无法加载 Codex 使用量。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  }
  async function resetCodexUsage(id: number) {
    setIsOperating(true);
    setError(null);
    try {
      await api.resetCodexChannelUsage(id);
      await loadCodexUsage(id);
      toast.success({ message: t("Codex usage reset", "Codex 使用量已重置") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to reset Codex usage.", "无法重置 Codex 使用量。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  }
  async function refreshCodexCredential(id: number) {
    setIsOperating(true);
    setError(null);
    try {
      await api.refreshCodexChannelCredential(id);
      toast.success({
        message: t("Codex credential refreshed", "Codex 凭证已刷新"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to refresh Codex credential.", "无法刷新 Codex 凭证。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  }
  async function loadOllamaVersion(id: number) {
    setIsOperating(true);
    setError(null);
    try {
      setCodexUsage(await api.ollamaVersion(id));
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load Ollama version.", "无法读取 Ollama 版本。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsOperating(false);
    }
  }

  const rows: ChannelRow[] = channels.map((channel) => ({
    ...channel,
    groups: channel.group
      ? channel.group
          .split(",")
          .map((group) => group.trim())
          .filter(Boolean)
      : [],
    models: channel.models
      ? channel.models.split(",").filter(Boolean).length
      : 0,
    statusLabel: channel.status === 1 ? "Active" : "Disabled",
    autoDisable: channel.auto_ban === undefined || channel.auto_ban !== 0,
    balance:
      typeof channel.balance === "number"
        ? channel.balance.toLocaleString()
        : "-",
    response: channel.response_time ? `${channel.response_time}ms` : "-",
    tested: formatChannelTime(channel.test_time),
  }));
  const filtered = rows;
  const columns = [
    {
      key: "name",
      title: t("Upstream Name", "上游名称"),
      render: (r: ChannelRow) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 flex flex-col gap-1">
          {" "}
          <span className="truncate font-medium text-[#121110]">{r.name}</span>{" "}
          {r.base_url && (
            <span className="text-[9px] font-mono text-[#121110]/40 uppercase tracking-wider">
              UPSTREAM: {r.base_url.split("://")[0]}{" "}
            </span>
          )}{" "}
          </div>
          <button
            type="button"
            className="icon-btn shrink-0"
            title={t("Edit channel", "编辑渠道")}
            aria-label={t("Edit channel", "编辑渠道")}
            onClick={() => openEditor(channels.find((channel) => channel.id === r.id))}
          >
            <Edit2 className="h-3.5 w-3.5 stroke-[1.5]" />
          </button>
        </div>
      ),
    },
    {
      key: "type",
      title: t("Protocol", "协议"),
      render: (r: ChannelRow) => (
        <span className="text-[12px] text-[#121110]/70">{r.type}</span>
      ),
    },
    {
      key: "groups",
      title: t("Groups", "分组"),
      render: (r: ChannelRow) => (
        <div className="flex flex-wrap gap-1">
          {" "}
          {r.groups.map((g: string) => (
            <span
              key={g}
              className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest border ${g === "svip" || g === "vip" ? "border-[#121110] bg-inverse text-[#FAFAFA]" : "border-[#121110]/10 bg-white text-[#121110]/60"}`}
            >
              {" "}
              {g}{" "}
            </span>
          ))}{" "}
        </div>
      ),
    },
    {
      key: "models",
      title: t("Models", "模型数"),
      render: (r: ChannelRow) => (
        <span className="font-mono text-caption text-[#121110]/60">
          {r.models}
        </span>
      ),
    },
    {
      key: "tag",
      title: t("Tag", "标签"),
      render: (r: ChannelRow) => (
        <span className="font-mono text-caption text-[#121110]/60">
          {r.tag || "-"}
        </span>
      ),
    },
    {
      key: "balance",
      title: t("Balance", "余额"),
      render: (r: ChannelRow) => (
        <span className="font-mono text-caption text-[#121110]">
          {r.balance}
        </span>
      ),
    },
    {
      key: "response",
      title: t("Latency", "延迟"),
      render: (r: ChannelRow) => (
        <div className="flex items-center gap-1.5">
          {" "}
          <div
            className={`w-1.5 h-1.5 rounded-full ${r.statusLabel === "Active" ? "bg-green-500" : "bg-inverse/40"}`}
          />{" "}
          <span className="font-mono text-caption text-[#121110]/60">
            {r.response}
          </span>{" "}
        </div>
      ),
    },
    {
      key: "priority",
      title: t("Priority", "优先级"),
      render: (r: ChannelRow) => (
        <span className="font-mono text-caption text-[#121110]">
          {r.priority}
        </span>
      ),
    },
    {
      key: "tested",
      title: t("Last test", "最近测试"),
      render: (r: ChannelRow) => (
        <span className="font-mono text-caption text-[#121110]/60">
          {r.tested}
        </span>
      ),
    },
    {
      key: "weight",
      title: t("Weight", "权重"),
      render: (r: ChannelRow) => (
        <span className="font-mono text-caption text-[#121110]/60">
          {r.weight}
        </span>
      ),
    },
    {
      key: "status",
      title: t("State", "状态"),
      render: (r: ChannelRow) => (
        <div className="flex items-center gap-2">
          {" "}
          <span
            className={`text-overline font-mono uppercase tracking-[0.1em] px-2 py-0.5 border ${r.statusLabel === "Active" ? "border-[#121110]/20 text-[#121110] bg-white/50" : "border-[#121110]/10 text-[#121110]/40 bg-inverse/5 line-through"}`}
          >
            {" "}
            {t(
              r.statusLabel,
              r.statusLabel === "Active" ? "活跃" : "已禁用",
            )}{" "}
          </span>{" "}
          {r.autoDisable && r.statusLabel === "Active" && (
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500/80 stroke-[1.5]" />
          )}{" "}
        </div>
      ),
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (r: ChannelRow) => (
        <div className="flex items-center gap-4">
          {" "}
          <button
            className="icon-btn"
            title={t("Test", "测试")}
            disabled={isOperating}
            onClick={() => void testChannelById(r.id)}
          >
            <Play className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            className="icon-btn"
            title={t("Details", "详情")}
            disabled={isOperating}
            onClick={() => void showChannelDetails(r.id)}
          >
            <Eye className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            className="icon-btn"
            title={t("Codex usage", "Codex 使用量")}
            disabled={isOperating}
            onClick={() => void loadCodexUsage(r.id)}
          >
            <Activity className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            className="icon-btn"
            title={t("Update balance", "更新余额")}
            disabled={isOperating}
            onClick={() => void updateChannelBalanceById(r.id)}
          >
            <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            className="icon-btn"
            title={t("Fetch models", "抓取模型")}
            disabled={isOperating}
            onClick={() => void fetchModelsById(r.id)}
          >
            <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            className="icon-btn"
            title={t("Detect upstream updates", "检测上游更新")}
            disabled={isOperating}
            onClick={() => void detectUpstreamUpdatesById(String(r.id))}
          >
            <Zap className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            className="icon-btn"
            title={t("Apply upstream updates", "应用上游更新")}
            disabled={isOperating}
            onClick={() => void applyUpstreamUpdatesById(String(r.id))}
          >
            <Play className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            className="icon-btn"
            title={t("Reset Codex usage", "重置 Codex 使用量")}
            disabled={isOperating}
            onClick={() => void resetCodexUsage(r.id)}
          >
            <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            className="icon-btn"
            title={t("Refresh Codex credential", "刷新 Codex 凭证")}
            disabled={isOperating}
            onClick={() => void refreshCodexCredential(r.id)}
          >
            <Network className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            className="icon-btn"
            title={t("Ollama version", "Ollama 版本")}
            disabled={isOperating}
            onClick={() => void loadOllamaVersion(r.id)}
          >
            <Activity className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            type="button"
            className="icon-btn"
            title={t(
              r.statusLabel === "Active" ? "Disable" : "Enable",
              r.statusLabel === "Active" ? "禁用" : "启用",
            )}
            disabled={isOperating}
            onClick={() => void toggleChannel(r)}
          >
            <Network className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <div className="w-px h-3 bg-inverse/10" />{" "}
          <button
            className="icon-btn"
            title={t("Edit", "编辑")}
            onClick={() =>
              openEditor(channels.find((channel) => channel.id === r.id))
            }
          >
            <Edit2 className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            className="icon-btn"
            title={t("Copy", "复制")}
            disabled={isOperating}
            onClick={() => void copyChannel(r)}
          >
            <Copy className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
          <button
            className="icon-btn hover:!text-red-600"
            title={t("Delete", "删除")}
            onClick={() => void deleteChannel(r)}
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>{" "}
        </div>
      ),
    },
  ];
  return (
    <PageContainer
      title={t("Routing Channels", "路由渠道")}
      subtitle={t(
        "Configure upstream model providers, manage group tags, and load balance.",
        "配置上游模型供应商、管理分组标签与负载均衡。",
      )}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {" "}
          <button
            className="flex items-center gap-2 bg-transparent border border-[#121110]/10 text-[#121110] px-4 py-3 text-overline font-mono uppercase tracking-widest hover:border-[#121110]/30 hover:bg-white transition-all duration-300 rounded-none shadow-sm active:scale-[0.98] ease-out-expo"
            disabled={isOperating}
            onClick={() => void testAllChannels()}
          >
            {" "}
            <Activity className="w-3.5 h-3.5 stroke-[1.5]" />{" "}
            <span className="hidden sm:inline">
              {t("Test All", "测试所有")}
            </span>{" "}
          </button>{" "}
          <button
            className="flex items-center gap-2 bg-transparent border border-[#121110]/10 text-[#121110] px-4 py-3 text-overline font-mono uppercase tracking-widest hover:border-[#121110]/30 hover:bg-white transition-all duration-300 rounded-none shadow-sm active:scale-[0.98] ease-out-expo"
            disabled={isOperating}
            onClick={() => void updateAllBalances()}
          >
            {" "}
            <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" />{" "}
            <span className="hidden sm:inline">
              {t("Update Balances", "更新余额")}
            </span>{" "}
          </button>{" "}
          <button
            className="flex items-center gap-2 bg-transparent border border-red-700/30 text-red-700 px-4 py-3 text-overline font-mono uppercase tracking-widest hover:bg-red-50 transition-all duration-300 rounded-none shadow-sm active:scale-[0.98] ease-out-expo"
            disabled={isOperating}
            onClick={() => void deleteDisabledChannels()}
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
            <span className="hidden sm:inline">
              {t("Clear disabled", "清理禁用")}
            </span>
          </button>{" "}
          <button
            className="flex items-center gap-2 bg-transparent border border-[#121110]/10 text-[#121110] px-4 py-3 text-overline font-mono uppercase tracking-widest hover:border-[#121110]/30 hover:bg-white transition-all duration-300 rounded-none shadow-sm active:scale-[0.98] ease-out-expo"
            disabled={isOperating}
            onClick={() => void detectUpstreamUpdates()}
          >
            <Network className="w-3.5 h-3.5 stroke-[1.5]" />
            <span className="hidden sm:inline">
              {t("Check upstream", "检查上游")}
            </span>
          </button>{" "}
          <button
            className="flex items-center gap-2 bg-transparent border border-[#121110]/10 text-[#121110] px-4 py-3 text-overline font-mono uppercase tracking-widest hover:border-[#121110]/30 hover:bg-white transition-all duration-300 rounded-none shadow-sm active:scale-[0.98] ease-out-expo"
            disabled={isOperating}
            onClick={() => void applyAllUpstreamUpdates()}
          >
            <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" />
            <span className="hidden sm:inline">
              {t("Apply upstream", "应用上游")}
            </span>
          </button>{" "}
          <button
            className="flex items-center gap-2 bg-transparent border border-[#121110]/10 text-[#121110] px-4 py-3 text-overline font-mono uppercase tracking-widest hover:border-[#121110]/30 hover:bg-white transition-all duration-300 rounded-none shadow-sm active:scale-[0.98] ease-out-expo"
            disabled={isOperating}
            onClick={() => void loadTagModels()}
          >
            <Activity className="w-3.5 h-3.5 stroke-[1.5]" />
            <span className="hidden sm:inline">
              {t("Tag models", "标签模型")}
            </span>
          </button>{" "}
          <button
            className="flex items-center gap-2 bg-transparent border border-[#121110]/10 text-[#121110] px-4 py-3 text-overline font-mono uppercase tracking-widest hover:border-[#121110]/30 hover:bg-white transition-all duration-300 rounded-none shadow-sm active:scale-[0.98] ease-out-expo"
            disabled={isOperating}
            onClick={() => void fixChannelAbilities()}
          >
            <AlertTriangle className="w-3.5 h-3.5 stroke-[1.5]" />
            <span className="hidden sm:inline">
              {t("Fix abilities", "修复能力")}
            </span>
          </button>{" "}
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 bg-inverse text-[#FAFAFA] px-6 py-3 text-overline font-mono uppercase tracking-widest rounded-none shadow-sm"
          >
            {" "}
            <Plus className="w-3.5 h-3.5 stroke-[1.5]" />{" "}
            {t("Add Channel", "添加渠道")}{" "}
          </button>{" "}
        </div>
      }
      isLoading={isLoading}
      error={error}
      onRetry={loadChannels}
    >
      {" "}
      <div className="shadow-page">
        {" "}
        {codexUsage !== null && (
          <pre className="mb-5 max-h-48 overflow-auto whitespace-pre-wrap break-all border border-[#121110]/10 bg-white p-4 font-mono text-caption">
            {JSON.stringify(codexUsage, null, 2)}
          </pre>
        )}
        {upstreamUpdates !== null && (
          <details className="mb-5 border border-[#121110]/10 bg-white p-4">
            <summary className="cursor-pointer text-overline font-mono uppercase tracking-widest">
              {t("Upstream update report", "上游更新报告")}
            </summary>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
              {JSON.stringify(upstreamUpdates, null, 2)}
            </pre>
          </details>
        )}
        {tagModels !== null && (
          <details className="mb-5 border border-[#121110]/10 bg-white p-4">
            <summary className="cursor-pointer text-overline font-mono uppercase tracking-widest">
              {t("Channel tag models", "渠道标签模型")}
            </summary>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
              {JSON.stringify(tagModels, null, 2)}
            </pre>
          </details>
        )}
        {channelDetailsResult !== null && (
          <details
            className="mb-5 border border-[#121110]/10 bg-white p-4"
            open
          >
            <summary className="cursor-pointer text-overline font-mono uppercase tracking-widest">
              {t("Channel details", "渠道详情")}
            </summary>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
              {JSON.stringify(channelDetailsResult, null, 2)}
            </pre>
          </details>
        )}
        <section className="mb-5 border border-[#121110]/10 bg-white p-4">
          <div className="mb-3 text-overline font-mono uppercase tracking-widest">
            {t("Ollama model management", "Ollama 模型管理")}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-overline font-mono uppercase">
              <span>{t("Channel", "渠道")}</span>
              <SelectMenu value={ollamaChannelId} onChange={setOllamaChannelId} options={[{ value: "", label: t("Select channel", "选择渠道") }, ...channels.map((channel) => ({ value: String(channel.id), label: displayChannelName(channel.name) }))]} />
            </label>
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-overline font-mono uppercase">
              <span>{t("Model name", "模型名称")}</span>
              <input
                value={ollamaModel}
                onChange={(event) => setOllamaModel(event.target.value)}
                placeholder="llama3"
                className="border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
              />
            </label>
            <button
              type="button"
              disabled={isOperating}
              onClick={() => void runOllamaAction("pull")}
              className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-40"
            >
              {t("Pull", "拉取")}
            </button>
            <button
              type="button"
              disabled={isOperating}
              onClick={() => void runOllamaAction("delete")}
              className="border border-red-700/30 px-4 py-2 text-overline font-mono uppercase text-red-700 disabled:opacity-40"
            >
              {t("Delete", "删除")}
            </button>
          </div>
          {ollamaResult !== null && (
            <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
              {JSON.stringify(ollamaResult, null, 2)}
            </pre>
          )}
        </section>
        <section className="mb-5 border border-[#121110]/10 bg-white p-4">
          <div className="mb-3 text-overline font-mono uppercase tracking-widest">
            {t("Channel tag operations", "渠道标签操作")}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-overline font-mono uppercase">
              <span>{t("Tag", "标签")}</span>
              <input
                value={channelTag}
                onChange={(event) => setChannelTag(event.target.value)}
                className="border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
              />
            </label>
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-overline font-mono uppercase">
              <span>{t("Action", "操作")}</span>
              <SelectMenu value={tagAction} onChange={setTagAction} options={[{ value: "disable", label: t("Disable", "禁用") }, { value: "enable", label: t("Enable", "启用") }, { value: "edit", label: t("Rename", "重命名") }]} />
            </label>
            {tagAction === "edit" && (
              <label className="flex min-w-40 flex-1 flex-col gap-1 text-overline font-mono uppercase">
                <span>{t("New tag", "新标签")}</span>
                <input
                  value={newChannelTag}
                  onChange={(event) => setNewChannelTag(event.target.value)}
                  className="border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
            )}
            <button
              type="button"
              disabled={isOperating}
              onClick={() => void runTagAction()}
              className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-40"
            >
              {t("Apply", "应用")}
            </button>
            <button
              type="button"
              disabled={isOperating || batchWorking || selectedIds.length === 0}
              onClick={() => void setSelectedChannelTag()}
              className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-40"
            >
              {t("Apply to selected", "应用到所选")}
            </button>
          </div>
        </section>
        <section className="mb-5 border border-[#121110]/10 bg-white p-4">
          <div className="mb-3 text-overline font-mono uppercase tracking-widest">
            {t("Multi-key management", "多密钥管理")}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-overline font-mono uppercase">
              <span>{t("Channel", "渠道")}</span>
              <SelectMenu value={multiKeyChannelId} onChange={setMultiKeyChannelId} options={[{ value: "", label: t("Select channel", "选择渠道") }, ...channels.map((channel) => ({ value: String(channel.id), label: displayChannelName(channel.name) }))]} />
            </label>
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-overline font-mono uppercase">
              <span>{t("Action", "操作")}</span>
              <SelectMenu value={multiKeyAction} onChange={setMultiKeyAction} options={[{ value: "get_key_status", label: t("View status", "查看状态") }, { value: "enable_key", label: t("Enable key", "启用密钥") }, { value: "disable_key", label: t("Disable key", "禁用密钥") }, { value: "delete_key", label: t("Delete key", "删除密钥") }, { value: "delete_disabled_keys", label: t("Delete disabled", "删除已禁用") }]} />
            </label>
            {["disable_key", "enable_key", "delete_key"].includes(
              multiKeyAction,
            ) && (
              <label className="flex w-28 flex-col gap-1 text-overline font-mono uppercase">
                <span>{t("Key index", "密钥索引")}</span>
                <input
                  type="number"
                  min="0"
                  value={multiKeyIndex}
                  onChange={(event) =>
                    setMultiKeyIndex(Number(event.target.value))
                  }
                  className="border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
            )}
            <button
              type="button"
              disabled={isOperating}
              onClick={() => void runMultiKeyAction()}
              className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-40"
            >
              {t("Run", "执行")}
            </button>
          </div>
          {multiKeyResult !== null && (
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
              {JSON.stringify(multiKeyResult, null, 2)}
            </pre>
          )}
        </section>
        {channelOps !== null && (
          <details className="mb-5 border border-[#121110]/10 bg-white p-4">
            <summary className="cursor-pointer text-overline font-mono uppercase tracking-widest">
              {t("Channel operation capabilities", "渠道操作能力")}
            </summary>
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
              {JSON.stringify(channelOps, null, 2)}
            </pre>
          </details>
        )}
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 border-b border-[#121110]/20 px-1 py-2 text-overline font-mono uppercase text-muted">
            <span>{t("Group", "分组")}</span>
            <SelectMenu value={groupFilter} onChange={(value) => { setGroupFilter(value); setPage(1); }} options={[{ value: "", label: t("All groups", "所有分组") }, ...groups.map((group) => ({ value: group, label: group }))]} />
          </label>
          <label className="flex items-center gap-2 border-b border-[#121110]/20 px-1 py-2 text-overline font-mono uppercase text-muted">
            <span>{t("Status", "状态")}</span>
            <SelectMenu value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }} options={[{ value: "", label: t("All statuses", "所有状态") }, { value: "1", label: t("Active", "启用") }, { value: "0", label: t("Disabled", "禁用") }]} />
          </label>
          <label className="flex items-center gap-2 border-b border-[#121110]/20 px-1 py-2 text-overline font-mono uppercase text-muted">
            <span>{t("Type ID", "类型 ID")}</span>
            <input
              type="number"
              min="0"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setPage(1);
              }}
              className="min-w-0 flex-1 bg-transparent text-xs text-[#121110] outline-none"
              placeholder={t("All types", "所有类型")}
            />
          </label>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          total={total}
          page={page}
          pageSize={10}
          onPageChange={setPage}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder={t(
            "Filter channels by name...",
            "按名称过滤渠道...",
          )}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          batchActions={[
            {
              key: "enable",
              label: batchWorking
                ? t("Working...", "处理中...")
                : t("Enable", "启用"),
              disabled: batchWorking,
              onClick: (ids) =>
                void batchOperation(
                  ids.map(String),
                  (channelIds) => api.batchUpdateChannelStatus(channelIds, 1),
                  t(
                    `Enable ${ids.length} channels?`,
                    `启用 ${ids.length} 个渠道？`,
                  ),
                ),
            },
            {
              key: "disable",
              label: t("Disable", "禁用"),
              disabled: batchWorking,
              onClick: (ids) =>
                void batchOperation(
                  ids.map(String),
                  (channelIds) => api.batchUpdateChannelStatus(channelIds, 0),
                  t(
                    `Disable ${ids.length} channels?`,
                    `禁用 ${ids.length} 个渠道？`,
                  ),
                ),
            },
            {
              key: "fetch",
              label: t("Fetch models", "抓取模型"),
              disabled: batchWorking,
              onClick: (ids) => void fetchModelsBatch(ids.map(String)),
            },
            {
              key: "delete",
              label: t("Delete", "删除"),
              variant: "danger",
              disabled: batchWorking,
              onClick: (ids) =>
                void batchOperation(
                  ids.map(String),
                  (channelIds) => api.deleteChannelBatch(channelIds),
                  t(
                    `Delete ${ids.length} channels?`,
                    `删除 ${ids.length} 个渠道？`,
                  ),
                ),
            },
          ]}
        />{" "}
      </div>{" "}
      {editor !== undefined && (
        <ChannelEditorModal
          editing={editor}
          groups={groups}
          isOperating={isOperating}
          onCancel={() => setEditor(undefined)}
          onSave={async (submitted, isCreate) => {
            setIsOperating(true);
            setError(null);
            try {
              const channel = {
                ...submitted,
                ...(editor ? { id: editor.id } : {}),
              };
              if (editor && !channel.key) {
                delete (channel as { key?: string }).key;
              }
              const payload = { mode: "single", channel };
              if (editor) await api.updateChannel(channel);
              else await api.createChannel(payload);
              setEditor(undefined);
              await loadChannels();
              toast.success({
                message: isCreate
                  ? t("Channel created", "渠道已创建")
                  : t("Channel updated", "渠道已更新"),
              });
            } catch (cause) {
              const message =
                cause instanceof Error
                  ? cause.message
                  : t("Unable to save channel.", "无法保存渠道。");
              setError(message);
              toast.error({ message });
            } finally {
              setIsOperating(false);
            }
          }}
        />
      )}
    </PageContainer>
  );
}
