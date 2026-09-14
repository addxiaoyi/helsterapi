import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  XCircle,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { ApiError, api, type ApiUser } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type Stats = {
  total_users?: number;
  enabled_users?: number;
  enabled_rate?: string;
  enabled_count?: number;
  disabled_count?: number;
  total?: number;
  locked_count?: number;
  users?: Array<{
    id?: number;
    username?: string;
    email?: string;
    two_factor_enabled?: boolean;
    locked?: boolean;
    last_used_at?: string;
  }>;
  [key: string]: unknown;
};

type Row = {
  id: number;
  username: string;
  email: string;
  two_factor_enabled: boolean;
  status: "Enabled" | "Disabled" | "Locked";
  has_backup_codes: boolean;
  last_verified_at: string;
};

function readNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function extractStats(payload: unknown): Stats {
  if (payload && typeof payload === "object") {
    return payload as Stats;
  }
  return {};
}

function deriveRows(stats: Stats): Row[] {
  const fromStats = (stats.users ?? []).filter(
    (item) => typeof item?.id === "number",
  ) as Array<NonNullable<Stats["users"]>[number]>;
  if (fromStats.length > 0) {
    return fromStats.map((item) => ({
      id: readNumber(item.id),
      username: String(item.username ?? `#${item.id}`),
      email: String(item.email ?? ""),
      two_factor_enabled: Boolean(item.two_factor_enabled),
      status: item.locked
        ? "Locked"
        : item.two_factor_enabled
          ? "Enabled"
          : "Disabled",
      has_backup_codes: false,
      last_verified_at: item.last_used_at
        ? new Date(item.last_used_at).toLocaleString()
        : "-",
    }));
  }
  return [];
}

export default function TwoFactor() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [stats, setStats] = useState<Stats>({});
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        api.adminTwoFactorStats(),
        api.users(1),
      ]);
      if (results[0].status === "fulfilled") {
        setStats(extractStats(results[0].value));
      }
      if (results[1].status === "fulfilled") {
        setUsers(results[1].value.items ?? []);
      }
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load 2FA statistics.", "无法加载 2FA 统计。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = deriveRows(stats);
  const filteredRows = rows.filter((row) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      row.username.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q)
    );
  });

  const enabledCount = readNumber(
    stats.enabled_users,
    readNumber(stats.enabled_count),
  );
  const totalUsers = readNumber(stats.total_users, readNumber(stats.total));
  const disabledCount = Math.max(0, totalUsers - enabledCount);
  const lockedCount =
    stats.locked_count === undefined ? null : readNumber(stats.locked_count);
  const totalCount = totalUsers || readNumber(stats.total);

  async function disableForUser(id: number, username: string) {
    const ok = await confirm({
      title: t("Disable 2FA", "禁用 2FA"),
      description: t(
        `Disable 2FA for ${username}? They will need to re-enroll on next login.`,
        `禁用 ${username} 的 2FA？该用户下次登录需重新设置。`,
      ),
      confirmText: t("Disable", "禁用"),
      variant: "danger",
    });
    if (!ok) return;
    setWorkingId(id);
    setError(null);
    try {
      await api.del<void>(`/user/${id}/2fa`);
      toast.success({ message: t("2FA disabled", "2FA 已禁用") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to disable 2FA.", "无法禁用 2FA。");
      setError(message);
      toast.error({ message });
    } finally {
      setWorkingId(null);
    }
  }

  async function resetPasskey(id: number, username: string) {
    const ok = await confirm({
      title: t("Reset Passkey", "重置 Passkey"),
      description: t(
        `Reset Passkey for ${username}? All their registered devices will be removed.`,
        `重置 ${username} 的 Passkey？该用户所有已注册设备会被移除。`,
      ),
      confirmText: t("Reset", "重置"),
      variant: "danger",
    });
    if (!ok) return;
    setWorkingId(id);
    setError(null);
    try {
      await api.del<void>(`/user/${id}/reset_passkey`);
      toast.success({ message: t("Passkey reset", "Passkey 已重置") });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to reset Passkey.", "无法重置 Passkey。");
      setError(message);
      toast.error({ message });
    } finally {
      setWorkingId(null);
    }
  }

  const columns = [
    {
      key: "username",
      title: t("User", "用户"),
      render: (row: Row) => (
        <div className="flex flex-col">
          <span className="font-mono text-[12px]">{row.username}</span>
          <span className="text-caption text-muted">#{row.id}</span>
        </div>
      ),
    },
    {
      key: "email",
      title: t("Email", "邮箱"),
      render: (row: Row) => (
        <span className="font-mono text-caption text-muted">{row.email}</span>
      ),
    },
    {
      key: "status",
      title: t("2FA status", "2FA 状态"),
      render: (row: Row) => {
        const enabled = row.status === "Enabled";
        const locked = row.status === "Locked";
        const className = enabled
          ? "border-green-700 bg-green-50 text-green-700"
          : locked
            ? "border-red-700 bg-red-50 text-red-700"
            : "border-[#121110]/20 bg-white text-muted";
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-overline font-mono uppercase border ${className}`}
          >
            {enabled ? (
              <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
            ) : locked ? (
              <XCircle className="h-3 w-3" strokeWidth={1.5} />
            ) : (
              <XCircle className="h-3 w-3" strokeWidth={1.5} />
            )}
            {row.status}
          </span>
        );
      },
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (row: Row) => (
        <div className="flex items-center gap-3 text-muted">
          <button
            type="button"
            title={t("Disable 2FA", "禁用 2FA")}
            disabled={!row.two_factor_enabled || workingId === row.id}
            onClick={() => void disableForUser(row.id, row.username)}
            className="hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ShieldOff className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("Reset Passkey", "重置 Passkey")}
            disabled={workingId === row.id}
            onClick={() => void resetPasskey(row.id, row.username)}
            className="hover:text-[#121110] disabled:opacity-30"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title={t("Two-Factor Authentication", "两步验证")}
      subtitle={t(
        "Review 2FA enrollment, force-disable for users, and reset their passkeys.",
        "查看 2FA 启用情况、强制禁用用户 2FA，并重置用户的 Passkey。",
      )}
      isLoading={loading}
      error={error}
      onRetry={load}
      actions={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("Refresh", "刷新")}
        </button>
      }
    >
      <div className="mb-6 grid grid-cols-1 gap-px border border-[#121110]/10 bg-inverse/10 md:grid-cols-4">
        <div className="bg-white p-6">
          <div className="mb-3 flex items-center justify-between text-overline font-mono uppercase tracking-widest text-muted">
            <span>{t("Total users", "总用户数")}</span>
            <Activity className="h-4 w-4" />
          </div>
          <p className="text-3xl font-serif">{totalCount}</p>
        </div>
        <div className="bg-white p-6">
          <div className="mb-3 flex items-center justify-between text-overline font-mono uppercase tracking-widest text-muted">
            <span>{t("2FA enabled", "已启用 2FA")}</span>
            <ShieldCheck className="h-4 w-4 text-green-700" />
          </div>
          <p className="text-3xl font-serif text-green-700">
            {enabledCount > 0
              ? enabledCount
              : rows.filter((row) => row.two_factor_enabled).length}
          </p>
        </div>
        <div className="bg-white p-6">
          <div className="mb-3 flex items-center justify-between text-overline font-mono uppercase tracking-widest text-muted">
            <span>{t("2FA disabled", "未启用 2FA")}</span>
            <ShieldOff className="h-4 w-4 text-muted" />
          </div>
          <p className="text-3xl font-serif text-muted">
            {disabledCount > 0
              ? disabledCount
              : rows.filter((row) => !row.two_factor_enabled).length}
          </p>
        </div>
        <div className="bg-white p-6">
          <div className="mb-3 flex items-center justify-between text-overline font-mono uppercase tracking-widest text-muted">
            <span>{t("Locked accounts", "被锁定的账户")}</span>
            <Shield className="h-4 w-4 text-red-700" />
          </div>
          <p className="text-3xl font-serif text-red-700">
            {lockedCount === null ? "-" : lockedCount}
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <label className="flex min-w-72 items-center gap-2 border-b border-[#121110]/20 px-2 py-2">
          <Shield className="h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Filter by username or email", "按用户名或邮箱过滤")}
            className="w-full bg-transparent text-[12px] outline-none"
          />
        </label>
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        total={filteredRows.length}
        page={1}
        pageSize={Math.max(filteredRows.length, 10)}
        onPageChange={() => {
          /* single page */
        }}
      />
    </PageContainer>
  );
}
