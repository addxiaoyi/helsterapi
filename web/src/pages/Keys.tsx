import {
  Copy,
  CopyPlus,
  KeyRound,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Zap,
  Clock,
  Hash,
  X,
  Download,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { DataTable } from "../components/ui/DataTable";
import { PageContainer } from "../components/ui/PageContainer";
import { useTableUrlState } from "../lib/useTableUrlState";
import { api, type ApiToken, type UserGroups } from "../lib/api";
import { useLang } from "../lib/LanguageContext";
import { useToast } from "../components/ui/Toast";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { downloadCsv, type CsvColumn } from "../lib/io";
import { GroupCombobox, type GroupOption } from "../components/ui/GroupCombobox";
import { GroupBadge, StatusBadge } from "../components/ui/StatusBadge";
import { MultiSelectMenu } from "../components/ui/MultiSelectMenu";
import { CCSwitchDialog } from "../components/ui/CCSwitchDialog";

const UNLIMITED_QUOTA = -1;
const TOKEN_AUTO_GROUP = "auto";
const MAX_TOKEN_NAME_LENGTH = 50;
const TOKEN_VALUE_SEPARATOR = /[\n,]+/;

function formatQuota(value: number, unlimited = false) {
  return unlimited || value === UNLIMITED_QUOTA
    ? "Unlimited"
    : value.toLocaleString();
}

function formatTimestamp(value: number) {
  return value > 0 ? new Date(value * 1000).toLocaleString() : "Never";
}

function splitTokenValues(value: string) {
  return [...new Set(value.split(TOKEN_VALUE_SEPARATOR).map((item) => item.trim()).filter(Boolean))];
}

function normalizeTokenValues(value: string) {
  return splitTokenValues(value).join(", ");
}

function isValidIpv4(value: string) {
  const parts = value.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
  );
}

function isValidIpv6(value: string) {
  if (!/^[0-9a-fA-F:]+$/.test(value)) return false;
  const sections = value.split("::");
  if (sections.length > 2) return false;
  const left = sections[0] ? sections[0].split(":") : [];
  const right = sections.length === 2 && sections[1] ? sections[1].split(":") : [];
  if ([...left, ...right].some((section) => !/^[0-9a-fA-F]{1,4}$/.test(section))) return false;
  return sections.length === 2
    ? left.length + right.length < 8
    : left.length === 8;
}

function isValidIpOrCidr(value: string) {
  const slash = value.lastIndexOf("/");
  const address = slash === -1 ? value : value.slice(0, slash);
  const prefix = slash === -1 ? undefined : value.slice(slash + 1);
  if (!address || (prefix !== undefined && !/^\d+$/.test(prefix))) return false;
  if (isValidIpv4(address)) {
    return prefix === undefined || Number(prefix) <= 32;
  }
  if (isValidIpv6(address)) {
    return prefix === undefined || Number(prefix) <= 128;
  }
  return false;
}

function validateRestrictions(models: string, ips: string, t: (en: string, zh?: string) => string) {
  const invalidIp = splitTokenValues(ips).find((ip) => !isValidIpOrCidr(ip));
  if (invalidIp) {
    return t(
      `IP allowlist contains an invalid address: ${invalidIp}`,
      `IP 白名单包含无效地址：${invalidIp}`,
    );
  }
  const invalidModel = splitTokenValues(models).find((model) => model.length > 200);
  return invalidModel
    ? t("A model restriction is too long.", "模型限制名称过长。")
    : null;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-white p-5">
      <div className="mt-0.5 rounded-none border border-[#121110]/10 p-1.5">
        <Icon className="h-3.5 w-3.5 text-[#121110]/40" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-overline font-mono uppercase tracking-widest text-muted">
          {label}
        </p>
        <p className="mt-0.5 font-mono text-label text-[#121110]">{value}</p>
        {sub && <p className="mt-0.5 text-caption text-muted">{sub}</p>}
      </div>
    </div>
  );
}

function UsageDetail({ token, groupDetails }: { token: ApiToken; groupDetails?: UserGroups }) {
  const { t } = useLang();
  return (
    <div className="space-y-4 py-4">
      <div>
        <p className="mb-3 text-overline font-mono uppercase tracking-widest text-muted">
          {t("Quota", "额度")}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Zap}
            label={t("Used", "已使用")}
            value={token.used_quota.toLocaleString()}
          />
          <StatCard
            icon={BarChart3}
            label={t("Remaining", "剩余")}
            value={formatQuota(token.remain_quota, token.unlimited_quota)}
          />
          <StatCard
            icon={Hash}
            label={t("Created", "创建时间")}
            value={formatTimestamp(token.created_time)}
          />
          <StatCard
            icon={Clock}
            label={t("Expires", "到期时间")}
            value={formatTimestamp(token.expired_time)}
          />
          <StatCard
            icon={Clock}
            label={t("Last used", "最近使用")}
            value={formatTimestamp(token.accessed_time ?? 0)}
          />
        </div>
      </div>
      <div className="grid gap-3 border-t border-[#121110]/10 pt-4 text-caption sm:grid-cols-2">
        <div>
          <span className="text-muted">{t("Group", "分组")}: </span>
          <div className="flex items-center gap-2"><GroupBadge name={token.group || "default"} ratio={groupDetails?.[token.group || ""]?.ratio} />{groupDetails?.[token.group || ""]?.desc && <span className="text-caption text-muted">{groupDetails[token.group || ""].desc}</span>}</div>
        </div>
        <div>
          <span className="text-muted">{t("IP allowlist", "IP 白名单")}: </span>
          <span className="font-mono">{normalizeTokenValues(token.allow_ips || "") || "-"}</span>
        </div>
        <div>
          <span className="text-muted">{t("Model limits", "模型限制")}: </span>
          <span className="font-mono">
            {token.model_limits_enabled
              ? normalizeTokenValues(token.model_limits || "") || t("Enabled", "已启用")
              : t("Disabled", "未启用")}
          </span>
        </div>
        <div>
          <span className="text-muted">
            {t("Cross-group retry", "跨分组重试")}:{" "}
          </span>
          <span className="font-mono">
            {token.cross_group_retry
              ? t("Enabled", "已启用")
              : t("Disabled", "未启用")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Kebab menu dropdown ───────────────────────────────────────────────────────

function KebabMenu({
  token,
  onCopyKey,
  onCopyBearer,
  onViewUsage,
  onDelete,
  onEdit,
  onImportCCSwitch,
}: {
  token: ApiToken;
  onCopyKey: () => void;
  onCopyBearer: () => void;
  onViewUsage: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onImportCCSwitch: () => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${open ? "kebab-open" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-none p-1 transition-colors hover:bg-inverse/5"
        title={t("More actions", "更多操作")}
      >
        <MoreHorizontal className="h-3.5 w-3.5 text-[#121110]/50" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-60 border border-[#121110]/10 bg-white shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-micro font-mono hover:bg-inverse/5"
          >
            <Edit2 className="h-3 w-3 text-[#121110]/40" />
            {t("Edit", "编辑")}
          </button>
          <div className="my-1 border-t border-[#121110]/5" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onImportCCSwitch();
            }}
            className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-micro font-mono hover:bg-inverse/5"
          >
            <CopyPlus className="h-3 w-3 text-[#121110]/40" />
            {t("Import to CC Switch", "导入到 CC Switch")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCopyKey();
            }}
            className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-micro font-mono hover:bg-inverse/5"
          >
            <Copy className="h-3 w-3 text-[#121110]/40" />
            {t("Copy Key", "复制 Key")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCopyBearer();
            }}
            className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-micro font-mono hover:bg-inverse/5"
          >
            <CopyPlus className="h-3 w-3 text-[#121110]/40" />
            {t("Copy as Bearer", "复制 Bearer 格式")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onViewUsage();
            }}
            className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-micro font-mono hover:bg-inverse/5"
          >
            <BarChart3 className="h-3 w-3 text-[#121110]/40" />
            {t("View Usage", "查看用量")}
          </button>
          <div className="my-1 border-t border-[#121110]/5" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-micro font-mono text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
            {t("Delete", "删除")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Keys page ───────────────────────────────────────────────────────────

export default function Keys() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const { page, search, setPage, setSearch } = useTableUrlState();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [groupDetails, setGroupDetails] = useState<UserGroups>({});
  const [tokenGroup, setTokenGroup] = useState("");
  const [tokenModels, setTokenModels] = useState("");
  const [tokenIps, setTokenIps] = useState("");
  const [tokenCrossGroupRetry, setTokenCrossGroupRetry] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchWorking, setBatchWorking] = useState(false);
  const [editing, setEditing] = useState<ApiToken | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuota, setEditQuota] = useState("0");
  const [editUnlimited, setEditUnlimited] = useState(true);
  const [editExpiry, setEditExpiry] = useState("0");
  const [editGroup, setEditGroup] = useState("");
  const [editModels, setEditModels] = useState("");
  const [editIps, setEditIps] = useState("");
  const [editCrossGroupRetry, setEditCrossGroupRetry] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [ccSwitchKey, setCcSwitchKey] = useState<string | null>(null);

  // Expanded rows tracking
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  // "View Usage" scrolls to and expands the row
  const expandedRowRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  async function openCCSwitch(token: ApiToken) {
    try {
      setCcSwitchKey(await api.tokenKey(token.id));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("Unable to prepare CC Switch import.", "无法准备 CC Switch 导入。");
      toast.error({ message });
    }
  }

  function editToken(token: ApiToken) {
    setEditing(token);
    setEditName(token.name);
    setEditQuota(String(token.remain_quota));
    setEditUnlimited(Boolean(token.unlimited_quota) || token.remain_quota === UNLIMITED_QUOTA);
    setEditExpiry(String(token.expired_time > 0 ? token.expired_time : UNLIMITED_QUOTA));
    setEditGroup(token.group || "");
    setEditModels(normalizeTokenValues(token.model_limits || ""));
    setEditIps(normalizeTokenValues(token.allow_ips || ""));
    setEditCrossGroupRetry(token.group === TOKEN_AUTO_GROUP && Boolean(token.cross_group_retry));
  }

  const loadTokens = useCallback(async (requestedPage = page) => {
    const rid = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.tokens(requestedPage, search.trim() || undefined);
      if (rid !== requestIdRef.current) return; // race guard
      setTokens(response.items);
      setSelectedIds([]);
      setTotal(response.total);
    } catch (cause) {
      if (rid !== requestIdRef.current) return;
      setTokens([]);
      setTotal(0);
      setError(cause instanceof Error ? cause.message : "无法加载令牌。");
    } finally {
      if (rid === requestIdRef.current) setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    void Promise.all([api.groups(), api.userGroups()]).then(([items, details]) => {
      setGroups([...new Set([TOKEN_AUTO_GROUP, ...items])]);
      setGroupDetails(details);
    }).catch((cause) => {
      console.error("Unable to load token groups", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : t("Unable to load token groups.", "无法加载令牌分组。"),
      );
    });
  }, [t]);

  const groupOptions: GroupOption[] = [
    { value: "", label: t("Default user group", "跟随用户分组") },
    ...groups.map((group) => ({
      value: group,
      label: group === TOKEN_AUTO_GROUP ? t("Auto", "自动") : group,
      description: group === TOKEN_AUTO_GROUP ? t("Use the global group order", "使用全局分组顺序") : groupDetails[group]?.desc,
      ratio: groupDetails[group]?.ratio,
    })),
  ];

  useEffect(() => {
    let active = true;
    void api.userModels().then((items) => {
      if (!active) return;
      setAvailableModels([...new Set(items.map((model) => model.trim()).filter(Boolean))]);
    }).catch((cause) => {
      console.error("Unable to load token model options", cause);
    });
    return () => {
      active = false;
    };
  }, []);

  async function copyTokenKey(token: ApiToken) {
    try {
      const secret = await api.tokenKey(token.id);
      await navigator.clipboard.writeText(secret);
      toast.success({ message: t("Token key copied", "令牌已复制") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to copy token.", "无法复制令牌。");
      setError(message);
      toast.error({ message });
    }
  }

  async function copyTokenBearer(token: ApiToken) {
    try {
      const secret = await api.tokenKey(token.id);
      await navigator.clipboard.writeText(`Authorization: Bearer ${secret}`);
      toast.success({ message: t("Bearer token copied", "Bearer 令牌已复制") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to copy Bearer token.", "无法复制 Bearer 格式。");
      setError(message);
      toast.error({ message });
    }
  }

  async function deleteToken(token: ApiToken) {
    const ok = await confirm({
      title: t("Delete Token", "删除令牌"),
      description: t(
        `Delete token "${token.name}"? This cannot be undone.`,
        `确定删除令牌 "${token.name}"？此操作不可恢复。`,
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteToken(token.id);
      await loadTokens();
      toast.success({ message: t("Token deleted", "令牌已删除") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to delete token.", "无法删除令牌。");
      setError(message);
      toast.error({ message });
    }
  }

  async function createToken(event: FormEvent) {
    event.preventDefault();
    const name = tokenName.trim();
    if (!name || name.length > MAX_TOKEN_NAME_LENGTH) {
      setError(t("Enter a token name of 1-50 characters.", "请输入 1-50 个字符的令牌名称。"));
      return;
    }
    const restrictionError = validateRestrictions(tokenModels, tokenIps, t);
    if (restrictionError) {
      setError(restrictionError);
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await api.addToken({
        name,
        remain_quota: 0,
        unlimited_quota: true,
        expired_time: UNLIMITED_QUOTA,
        group: tokenGroup || undefined,
        model_limits_enabled: splitTokenValues(tokenModels).length > 0,
        model_limits: normalizeTokenValues(tokenModels) || undefined,
        allow_ips: normalizeTokenValues(tokenIps) || undefined,
        cross_group_retry: tokenGroup === TOKEN_AUTO_GROUP && tokenCrossGroupRetry,
      });
      setTokenName("");
      setTokenGroup("");
      setTokenModels("");
      setTokenIps("");
      setTokenCrossGroupRetry(false);
      setCreateOpen(false);
      setPage(1);
      await loadTokens(1);
      toast.success({ message: t("Token created", "令牌已创建") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to create token.", "无法创建令牌。");
      setError(message);
      toast.error({ message });
    } finally {
      setCreating(false);
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: t("Delete Selected Tokens", "删除所选令牌"),
      description: t(
        `Delete ${selectedIds.length} selected tokens? This cannot be undone.`,
        `确定删除所选的 ${selectedIds.length} 个令牌？此操作不可恢复。`,
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    setBatchWorking(true);
    try {
      await api.deleteTokenBatch(selectedIds);
      const count = selectedIds.length;
      setSelectedIds([]);
      await loadTokens();
      toast.success({
        message: t(`Deleted ${count} tokens`, `已删除 ${count} 个令牌`),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to delete selected tokens.", "无法删除所选令牌。");
      setError(message);
      toast.error({ message });
    } finally {
      setBatchWorking(false);
    }
  }

  async function copySelected() {
    if (selectedIds.length === 0) return;
    setBatchWorking(true);
    try {
      const values = await api.tokenKeysBatch(selectedIds);
      await navigator.clipboard.writeText(
        values.map((item) => item.key).join("\n"),
      );
      toast.success({
        message: t(
          `Copied ${values.length} keys`,
          `已复制 ${values.length} 个令牌`,
        ),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to copy selected tokens.", "无法复制所选令牌。");
      setError(message);
      toast.error({ message });
    } finally {
      setBatchWorking(false);
    }
  }

  async function exportTokenCsv() {
    const columns: CsvColumn<ApiToken>[] = [
      { key: "name", header: "Name" },
      { key: "key", header: "Token" },
      { key: "group", header: "Group" },
      { key: "status", header: "Status" },
      {
        key: "remain_quota",
        header: "Remain Quota",
        format: (v, row) =>
          row.unlimited_quota || v === UNLIMITED_QUOTA ? "Unlimited" : String(v),
      },
      {
        key: "used_quota",
        header: "Used Quota",
        format: (v) => (v === -1 ? "Unlimited" : String(v)),
      },
      {
        key: "created_time",
        header: "Created",
        format: (v) => formatTimestamp(v as number),
      },
      {
        key: "expired_time",
        header: "Expires",
        format: (v) => formatTimestamp(v as number),
      },
      {
        key: "accessed_time",
        header: "Last Used",
        format: (v) => formatTimestamp((v as number) || 0),
      },
      {
        key: "model_limits",
        header: "Model Limits",
      },
      {
        key: "allow_ips",
        header: "Allow IPs",
      },
    ];
    downloadCsv("token-audit.csv", tokens, columns);
    toast.success({
      message: t("CSV exported", "CSV 已导出"),
    });
  }

  async function saveToken(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const name = editName.trim();
    if (!name || name.length > MAX_TOKEN_NAME_LENGTH) {
      setError(t("Enter a token name of 1-50 characters.", "请输入 1-50 个字符的令牌名称。"));
      return;
    }
    const quota = Number(editQuota);
    const expiry = Number(editExpiry);
    if (
      (!editUnlimited && (!Number.isFinite(quota) || quota < 0)) ||
      !Number.isInteger(expiry) ||
      (expiry < 0 && expiry !== UNLIMITED_QUOTA)
    ) {
      setError(t("Enter valid quota and expiry values.", "请输入有效的额度和过期时间。"));
      return;
    }
    const restrictionError = validateRestrictions(editModels, editIps, t);
    if (restrictionError) {
      setError(restrictionError);
      return;
    }
    setEditSaving(true);
    setError(null);
    try {
      await api.updateToken({
        id: editing.id,
        name,
        remain_quota: editUnlimited ? 0 : quota,
        unlimited_quota: editUnlimited,
        expired_time: expiry,
        status: editing.status,
        group: editGroup || undefined,
        model_limits_enabled: splitTokenValues(editModels).length > 0,
        model_limits: normalizeTokenValues(editModels) || undefined,
        allow_ips: normalizeTokenValues(editIps) || undefined,
        cross_group_retry: editGroup === TOKEN_AUTO_GROUP && editCrossGroupRetry,
      });
      setEditing(null);
      await loadTokens();
      toast.success({ message: t("Token updated", "令牌已更新") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to update token.", "无法更新令牌。");
      setError(message);
      toast.error({ message });
    } finally {
      setEditSaving(false);
    }
  }

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAndScroll(id: number) {
    setExpandedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Scroll the expanded panel into view after a tick
    setTimeout(() => {
      expandedRowRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 50);
  }

  const columns = [
    {
      key: "name",
      title: t("Token Name", "令牌名称"),
      render: (token: ApiToken) => (
        <span className="flex items-center gap-2 font-medium">
          <KeyRound className="h-3.5 w-3.5 text-[#121110]/40" />
          {token.name}
        </span>
      ),
    },
    {
      key: "key",
      title: t("Secret Token", "令牌"),
      render: (token: ApiToken) => (
        <span className="font-mono text-caption text-[#121110]/60">
          {token.key}
        </span>
      ),
    },
    {
      key: "remain_quota",
      title: t("Remain Quota", "剩余额度"),
      render: (token: ApiToken) => (
        <span className="font-mono text-caption">
          {formatQuota(token.remain_quota, token.unlimited_quota)}
        </span>
      ),
    },
    {
      key: "group",
      title: t("Group", "分组"),
      render: (token: ApiToken) => <GroupBadge name={token.group || "default"} ratio={groupDetails[token.group || ""]?.ratio} onClick={() => editToken(token)} />,
    },
    {
      key: "used_quota",
      title: t("Used Quota", "已用额度"),
      render: (token: ApiToken) => (
        <span className="font-mono text-caption">
          {token.used_quota.toLocaleString()}
        </span>
      ),
    },
    {
      key: "expired_time",
      title: t("Expires", "过期时间"),
      render: (token: ApiToken) => (
        <span className="font-mono text-caption text-[#121110]/60">
          {formatTimestamp(token.expired_time)}
        </span>
      ),
    },
    {
      key: "status",
      title: t("State", "状态"),
      render: (token: ApiToken) => (
        <span className="text-overline font-mono uppercase tracking-widest">
          <StatusBadge enabled={token.status === 1} label={token.status === 1 ? t("Active", "启用") : t("Disabled", "已禁用")} />
        </span>
      ),
    },
    {
      key: "actions",
      title: "",
      render: (token: ApiToken) => (
        <div className="flex items-center gap-2">
          {/* Inline quick actions */}
          <button
            type="button"
            title={t("Copy as Bearer", "复制 Bearer 格式")}
            onClick={() => void copyTokenBearer(token)}
            className="rounded-none p-1 transition-colors hover:bg-inverse/5"
          >
            <CopyPlus className="h-3.5 w-3.5 text-[#121110]/40" />
          </button>
          <button
            type="button"
            title={t("Details", "详情")}
            onClick={() => toggleExpanded(token.id)}
            className="rounded-none p-1 transition-colors hover:bg-inverse/5"
          >
            {expandedIds.has(token.id) ? (
              <ChevronUp className="h-3.5 w-3.5 text-[#121110]/50" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[#121110]/50" />
            )}
          </button>
          <KebabMenu
            token={token}
            onCopyKey={() => void copyTokenKey(token)}
            onCopyBearer={() => void copyTokenBearer(token)}
            onViewUsage={() => expandAndScroll(token.id)}
            onDelete={() => void deleteToken(token)}
            onImportCCSwitch={() => void openCCSwitch(token)}
            onEdit={() => {
              setEditing(token);
              setEditName(token.name);
              setEditQuota(String(token.remain_quota));
              setEditUnlimited(Boolean(token.unlimited_quota) || token.remain_quota === UNLIMITED_QUOTA);
              setEditExpiry(String(token.expired_time > 0 ? token.expired_time : UNLIMITED_QUOTA));
              setEditGroup(token.group || "");
              setEditModels(normalizeTokenValues(token.model_limits || ""));
              setEditIps(normalizeTokenValues(token.allow_ips || ""));
              setEditCrossGroupRetry(token.group === TOKEN_AUTO_GROUP && Boolean(token.cross_group_retry));
            }}
          />
        </div>
      ),
    },
  ];

  // Build rows with optional detail panels
  const rows = tokens.flatMap((token) => {
    const main = { ...token };
    const detail: React.ReactNode = expandedIds.has(token.id) ? (
      <div
        ref={expandedRowRef}
        className="border-t border-[#121110]/10 bg-primary/50 px-6 py-4"
      >
        <UsageDetail token={token} groupDetails={groupDetails} />
      </div>
    ) : undefined;
    return [{ ...main, _detail: detail }] as Array<
      ApiToken & { _detail?: React.ReactNode }
    >;
  });

  return (
    <PageContainer
      title={t("Access Tokens", "访问令牌")}
      subtitle={t(
        "Create and manage credentials for the OpenAI-compatible gateway.",
        "创建和管理 OpenAI 兼容网关的访问凭证。",
      )}
      isLoading={isLoading}
      error={error}
      onRetry={() => void loadTokens()}
      actions={
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-inverse px-6 py-3 text-overline font-mono uppercase tracking-widest text-[#FAFAFA] disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("Mint New Token", "新建令牌")}
        </button>
      }
    >
      <div className="mb-6 grid gap-px border border-[#121110]/10 bg-[#121110]/10 sm:grid-cols-3">
        <StatCard
          icon={KeyRound}
          label={t("Total tokens", "令牌总数")}
          value={total.toLocaleString()}
          sub={t("Credentials on this page", "当前令牌总量")}
        />
        <StatCard
          icon={Zap}
          label={t("Active tokens", "启用令牌")}
          value={tokens.filter((token) => token.status === 1).length.toLocaleString()}
          sub={t("Ready for requests", "可用于请求")}
        />
        <StatCard
          icon={BarChart3}
          label={t("Available groups", "可用分组")}
          value={Object.keys(groupDetails).length.toLocaleString()}
          sub={t("Group routing options", "分组路由选项")}
        />
      </div>
      <div className="mb-6 flex items-center justify-between border border-[#121110]/10 bg-white p-5">
        <span className="font-mono text-[12px]">
          {window.location.origin}/v1
        </span>
        <button
          onClick={() =>
            void navigator.clipboard.writeText(`${window.location.origin}/v1`)
          }
          title={t("Copy endpoint", "复制接口地址")}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>

      <DataTable
        columns={columns}
        data={rows as unknown as ApiToken[]}
        total={total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder={t("Locate by token name...", "按令牌名称搜索...")}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids as number[])}
        batchActions={[
          {
            key: "copy-keys",
            label: batchWorking
              ? t("Working...", "处理中...")
              : t("Copy selected", "复制所选"),
            disabled: batchWorking || selectedIds.length === 0,
            onClick: () => void copySelected(),
          },
          {
            key: "delete-keys",
            label: t("Delete selected", "删除所选"),
            variant: "danger",
            disabled: batchWorking || selectedIds.length === 0,
            onClick: () => void deleteSelected(),
          },
        ]}
        expandedIds={expandedIds}
        renderExpandedRow={(token) =>
          (token as ApiToken & { _detail?: React.ReactNode })._detail
        }
      />

      <div className="mt-4 flex items-center gap-3">
        <button
          className="flex items-center gap-2 text-overline font-mono uppercase tracking-widest text-muted hover:text-ink"
          onClick={() => void loadTokens()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("Refresh", "刷新")}
        </button>
        {tokens.length > 0 && (
          <button
            className="flex items-center gap-2 text-overline font-mono uppercase tracking-widest text-muted hover:text-ink"
            onClick={exportTokenCsv}
            title={t("Export token audit to CSV", "导出令牌审计 CSV")}
          >
            <Download className="h-3.5 w-3.5" />
            {t("Export CSV", "导出 CSV")}
          </button>
        )}
      </div>

      {/* ── Create modal ── */}
      {createOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end bg-inverse/40" role="dialog" aria-modal="true" aria-labelledby="create-token-title">
          <div className="relative flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-ink/10 bg-primary shadow-drawer">
            <div className="flex shrink-0 items-center justify-between border-b border-ink/10 px-5 py-4 sm:px-6">
              <h2 className="font-serif text-2xl">
                <span id="create-token-title">
                {t("Mint New Token", "新建令牌")}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="icon-btn"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={createToken} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <label className="block space-y-2 text-overline font-mono uppercase tracking-widest">
                <span>{t("Token name", "令牌名称")}</span>
                <input
                  required
                  maxLength={MAX_TOKEN_NAME_LENGTH}
                  value={tokenName}
                  onChange={(event) => setTokenName(event.target.value)}
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>
              <label className="block space-y-2 text-overline font-mono uppercase tracking-widest">
                <span>{t("Group", "分组")}</span>
              <GroupCombobox
                value={tokenGroup}
                options={groupOptions}
                placeholder={t("Default user group", "跟随用户分组")}
                onChange={(group) => {
                  setTokenGroup(group);
                  setTokenCrossGroupRetry(group === TOKEN_AUTO_GROUP);
                }}
              />
              </label>
              <label className="block space-y-2 text-overline font-mono uppercase tracking-widest">
                <span>{t("Model limits", "模型限制")}</span>
                {availableModels.length > 0 && (
                  <MultiSelectMenu values={splitTokenValues(tokenModels).filter((model) => availableModels.includes(model))} options={availableModels.map((model) => ({ value: model, label: model }))} onChange={(values) => setTokenModels(values.join(", "))} placeholder={t("Select models", "选择模型")} />
                )}
                <textarea
                  value={tokenModels}
                  onChange={(event) => setTokenModels(event.target.value)}
                  rows={3}
                  placeholder={t("Select or enter models; empty allows all", "选择或输入模型；留空表示允许全部")}
                  className="w-full resize-y border border-[#121110]/20 bg-transparent px-2 py-2 text-sm outline-none"
                />
              </label>
              <label className="block space-y-2 text-overline font-mono uppercase tracking-widest">
                <span>{t("IP allowlist (CIDR supported)", "IP 白名单（支持 CIDR）")}</span>
                <textarea
                  value={tokenIps}
                  onChange={(event) => setTokenIps(event.target.value)}
                  rows={3}
                  placeholder={t("One IP per line; empty allows all", "每行一个 IP；留空表示不限制")}
                  className="w-full resize-y border border-[#121110]/20 bg-transparent px-2 py-2 text-sm outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={tokenCrossGroupRetry}
                  disabled={tokenGroup !== TOKEN_AUTO_GROUP}
                  onChange={(event) => setTokenCrossGroupRetry(event.target.checked)}
                />
                {t("Cross-group retry", "跨分组重试")}
              </label>
              </div>
              <div className="flex shrink-0 justify-end gap-3 border-t border-ink/10 bg-primary/95 px-5 py-4 backdrop-blur sm:px-6">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
                >
                  {t("Cancel", "取消")}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-inverse px-5 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
                >
                  {creating
                    ? t("Creating...", "创建中...")
                    : t("Create", "创建")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editing && (
        <div className="fixed inset-0 z-[200] flex justify-end bg-inverse/40" role="dialog" aria-modal="true" aria-labelledby="edit-token-title">
          <div className="relative flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-ink/10 bg-primary shadow-drawer">
            <div className="flex shrink-0 items-center justify-between border-b border-ink/10 px-5 py-4 sm:px-6">
              <h2 className="font-serif text-2xl">
                <span id="edit-token-title">
                {t("Edit Token", "编辑令牌")}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="icon-btn"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveToken} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <input
                required
                maxLength={MAX_TOKEN_NAME_LENGTH}
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                placeholder={t("Name", "名称")}
              />
              <GroupCombobox
                value={editGroup}
                options={groupOptions}
                placeholder={t("Default user group", "跟随用户分组")}
                onChange={(group) => {
                  setEditGroup(group);
                  setEditCrossGroupRetry(group === TOKEN_AUTO_GROUP);
                }}
              />
              <label className="block space-y-2 text-overline font-mono uppercase tracking-widest">
                <span>{t("Model limits", "模型限制")}</span>
                {availableModels.length > 0 && (
                  <MultiSelectMenu values={splitTokenValues(editModels).filter((model) => availableModels.includes(model))} options={availableModels.map((model) => ({ value: model, label: model }))} onChange={(values) => setEditModels(values.join(", "))} placeholder={t("Select models", "选择模型")} />
                )}
                <textarea
                  value={editModels}
                  onChange={(event) => setEditModels(event.target.value)}
                  rows={3}
                  placeholder={t("Select or enter models; empty allows all", "选择或输入模型；留空表示允许全部")}
                  className="w-full resize-y border border-[#121110]/20 bg-transparent px-2 py-2 text-sm outline-none"
                />
              </label>
              <label className="block space-y-2 text-overline font-mono uppercase tracking-widest">
                <span>{t("IP allowlist (CIDR supported)", "IP 白名单（支持 CIDR）")}</span>
                <textarea
                  value={editIps}
                  onChange={(event) => setEditIps(event.target.value)}
                  rows={3}
                  placeholder={t("One IP per line; empty allows all", "每行一个 IP；留空表示不限制")}
                  className="w-full resize-y border border-[#121110]/20 bg-transparent px-2 py-2 text-sm outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={editCrossGroupRetry}
                  disabled={editGroup !== TOKEN_AUTO_GROUP}
                  onChange={(event) => setEditCrossGroupRetry(event.target.checked)}
                />
                {t("Cross-group retry", "跨分组重试")}
              </label>
              <input
                type="number"
                min="0"
                value={editQuota}
                disabled={editUnlimited}
                onChange={(event) => setEditQuota(event.target.value)}
                className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none disabled:opacity-50"
                placeholder={t("Remaining quota", "剩余额度")}
              />
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={editUnlimited}
                  onChange={(event) => setEditUnlimited(event.target.checked)}
                />
                {t("Unlimited quota", "无限额度")}
              </label>
              <input
                type="number"
                min={UNLIMITED_QUOTA}
                value={editExpiry}
                onChange={(event) => setEditExpiry(event.target.value)}
                className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                placeholder={t("Expiry timestamp", "过期时间戳")}
              />
              </div>
              <div className="flex shrink-0 justify-end gap-3 border-t border-ink/10 bg-primary/95 px-5 py-4 backdrop-blur sm:px-6">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
                >
                  {t("Cancel", "取消")}
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="bg-inverse px-5 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
                >
                  {editSaving ? t("Saving...", "保存中...") : t("Save", "保存")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <CCSwitchDialog open={ccSwitchKey !== null} tokenKey={ccSwitchKey ?? ""} models={availableModels} onClose={() => setCcSwitchKey(null)} />
    </PageContainer>
  );
}
