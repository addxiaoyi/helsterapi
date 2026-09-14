import { useEffect, useState } from "react";
import {
  Shield,
  User,
  Wallet,
  Edit2,
  Trash2,
  Plus,
  Fingerprint,
  Smartphone,
  Download,
  Eye,
  Power,
} from "lucide-react";
import { PageContainer } from "./../components/ui/PageContainer";
import { DataTable } from "./../components/ui/DataTable";
import { useToast } from "./../components/ui/Toast";
import { useConfirm } from "./../components/ui/ConfirmDialog";
import { ApiError, api, type AdminUser, type OAuthBinding } from "./../lib/api";
import { useLang } from "../lib/LanguageContext";
import { downloadCsv, type CsvColumn } from "../lib/export";
import { SelectMenu } from "../components/ui/SelectMenu";

const PAGE_SIZE = 10;

function formatUserTime(value?: number) {
  return value && value > 0 ? new Date(value * 1000).toLocaleString() : "-";
}

export default function Users() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<AdminUser | null | undefined>(undefined);
  const [form, setForm] = useState({
    username: "",
    display_name: "",
    password: "",
    email: "",
    setting: "",
    group: "",
    role: 1,
    quota: 0,
  });
  const [saving, setSaving] = useState(false);
  const [topupUser, setTopupUser] = useState<AdminUser | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupSaving, setTopupSaving] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [twoFactorStats, setTwoFactorStats] = useState<unknown>(null);
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
  const [batchTopupAmount, setBatchTopupAmount] = useState("");
  const [batchWorking, setBatchWorking] = useState(false);
  const [oauthUser, setOauthUser] = useState<AdminUser | null>(null);
  const [oauthBindings, setOauthBindings] = useState<OAuthBinding[]>([]);
  const [oauthLoading, setOauthLoading] = useState(false);
  const userQuery = {
    group: groupFilter || undefined,
    role: roleFilter ? Number(roleFilter) : undefined,
    status: statusFilter ? Number(statusFilter) : undefined,
  };

  useEffect(() => {
    api
      .userGroups()
      .then((items) => setGroups(Object.keys(items)))
      .catch((cause) => {
        console.error("Unable to load user groups for the user editor", cause);
        setGroups([]);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .users(page, search, userQuery)
      .then((result) => {
        setUsers(result.items ?? []);
        setTotal(result.total ?? 0);
      })
      .catch((cause) =>
        setError(
          cause instanceof ApiError ? cause.message : "无法读取用户列表。",
        ),
      )
      .finally(() => setLoading(false));
  }, [groupFilter, page, roleFilter, search, statusFilter]);

  async function removeUser(user: AdminUser) {
    const ok = await confirm({
      title: t("Delete User", "删除用户"),
      description: t(
        `Permanently delete "${user.display_name || user.username}"? This cannot be undone.`,
        `确定永久删除 "${user.display_name || user.username}"？此操作不可恢复。`,
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setTotal((current) => Math.max(current - 1, 0));
      toast.success({ message: t("User deleted", "用户已删除") });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to delete user.", "无法删除用户。");
      setError(message);
      toast.error({ message });
    }
  }

  async function manageUserAction(
    user: AdminUser,
    action: "disable" | "enable" | "promote" | "demote",
  ) {
    const labels = {
      disable: ["Disable user", "禁用用户", "User disabled", "用户已禁用"],
      enable: ["Enable user", "启用用户", "User enabled", "用户已启用"],
      promote: [
        "Promote user",
        "提升为管理员",
        "User promoted",
        "用户已提升为管理员",
      ],
      demote: [
        "Demote user",
        "降级为普通用户",
        "User demoted",
        "用户已降级为普通用户",
      ],
    } as const;
    const [titleEn, titleZh, successEn, successZh] = labels[action];
    const ok = await confirm({
      title: t(titleEn, titleZh),
      description: t(
        `Are you sure you want to ${action} "${user.display_name || user.username}"?`,
        `确定要${titleZh.replace("用户", "")}“${user.display_name || user.username}”吗？`,
      ),
      confirmText: t("Continue", "继续"),
    });
    if (!ok) return;
    try {
      await api.manageUser({ id: user.id, action });
      toast.success({ message: t(successEn, successZh) });
      const result = await api.users(page, search, userQuery);
      setUsers(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to update user status.", "无法更新用户状态。");
      setError(message);
      toast.error({ message });
    }
  }

  function openEditor(user?: AdminUser) {
    setEditor(user ?? null);
    setForm({
      username: user?.username ?? "",
      display_name: user?.display_name ?? "",
      password: "",
      email: user?.email ?? "",
      setting: user?.setting ?? "",
      group: user?.group ?? groups[0] ?? "",
      role: user?.role ?? 1,
      quota: user?.quota ?? 0,
    });
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!editor && form.password.length < 8) || (form.password && form.password.length < 8)) {
      setError(t("Password must be at least 8 characters.", "密码至少需要 8 个字符。"));
      return;
    }
    if (!Number.isInteger(form.quota) || form.quota < 0) {
      setError(t("Quota must be a non-negative integer.", "额度必须是非负整数。"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, ...(editor ? { id: editor.id } : {}) };
      if (editor && !payload.password)
        delete (payload as { password?: string }).password;
      await (editor ? api.updateUser(payload) : api.createUser(payload));
      setEditor(undefined);
      const result = await api.users(page, search, userQuery);
      setUsers(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("Unable to save user.", "无法保存用户。"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function topUpUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(topupAmount);
    if (!topupUser || !Number.isInteger(value) || value <= 0) {
      setError(
        t(
          "Enter a positive integer quota amount.",
          "请输入大于 0 的整数额度。",
        ),
      );
      return;
    }
    setTopupSaving(true);
    setError(null);
    try {
      await api.manageUser({
        id: topupUser.id,
        action: "add_quota",
        mode: "add",
        value,
      });
      setTopupUser(null);
      setTopupAmount("");
      const result = await api.users(page, search, userQuery);
      setUsers(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t("Unable to add quota.", "无法增加额度。"),
      );
    } finally {
      setTopupSaving(false);
    }
  }
  async function resetPasskey(user: AdminUser) {
    const ok = await confirm({
      title: t("Reset Passkey", "重置 Passkey"),
      description: t(
        `Reset Passkey for "${user.display_name || user.username}"? All registered devices will be removed.`,
        `重置 "${user.display_name || user.username}" 的 Passkey？该用户所有已注册设备会被移除。`,
      ),
      confirmText: t("Reset", "重置"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.adminResetPasskey(user.id);
      toast.success({ message: t("Passkey reset", "Passkey 已重置") });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to reset Passkey.", "无法重置 Passkey。");
      setError(message);
      toast.error({ message });
    }
  }
  async function disableTwoFactor(user: AdminUser) {
    const ok = await confirm({
      title: t("Disable 2FA", "禁用 2FA"),
      description: t(
        `Disable 2FA for "${user.display_name || user.username}"? They will need to re-enroll.`,
        `禁用 "${user.display_name || user.username}" 的 2FA？该用户需重新设置。`,
      ),
      confirmText: t("Disable", "禁用"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.adminDisableTwoFactor(user.id);
      toast.success({ message: t("2FA disabled", "2FA 已禁用") });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to disable 2FA.", "无法禁用 2FA。");
      setError(message);
      toast.error({ message });
    }
  }
  async function loadTwoFactorStats() {
    try {
      setTwoFactorStats(await api.adminTwoFactorStats());
      setError(null);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load 2FA statistics.", "无法加载 2FA 统计。");
      setError(message);
      toast.error({ message });
    }
  }

  async function showOAuthBindings(user: AdminUser) {
    setOauthUser(user);
    setOauthBindings([]);
    setOauthLoading(true);
    setError(null);
    try {
      setOauthBindings(await api.adminUserOAuthBindings(user.id));
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load OAuth bindings.", "无法加载 OAuth 绑定。");
      setError(message);
      toast.error({ message });
    } finally {
      setOauthLoading(false);
    }
  }

  async function unbindOAuth(binding: OAuthBinding) {
    if (!oauthUser) return;
    const ok = await confirm({
      title: t("Unbind OAuth", "解绑 OAuth"),
      description: t(
        `Remove the ${binding.provider_name} binding from ${oauthUser.username}?`,
        `确定解除 ${oauthUser.username} 的 ${binding.provider_name} 绑定？`,
      ),
      confirmText: t("Unbind", "解绑"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.adminUnbindOAuth(oauthUser.id, binding.provider_id);
      setOauthBindings((current) =>
        current.filter((item) => item.provider_id !== binding.provider_id),
      );
      toast.success({
        message: t("OAuth binding removed.", "OAuth 绑定已解除。"),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to unbind OAuth.", "无法解除 OAuth 绑定。");
      setError(message);
      toast.error({ message });
    }
  }

  async function clearLegacyBinding(bindingType: string, label: string) {
    if (!oauthUser) return;
    const ok = await confirm({
      title: t("Clear account binding", "清除账户绑定"),
      description: t(
        `Clear the ${label} binding for ${oauthUser.username}?`,
        `确定清除 ${oauthUser.username} 的 ${label} 绑定？`,
      ),
      confirmText: t("Clear", "清除"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.clearUserBinding(oauthUser.id, bindingType);
      toast.success({
        message: t(`${label} binding cleared.`, `${label} 绑定已清除。`),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to clear account binding.", "无法清除账户绑定。");
      setError(message);
      toast.error({ message });
    }
  }

  async function batchTopup() {
    if (selectedIds.length === 0) return;
    const input = await confirm({
      title: t("Batch Add Quota", "批量增加额度"),
      description: t(
        `Add the same amount of credits to ${selectedIds.length} selected users.`,
        `向所选的 ${selectedIds.length} 个用户各增加相同额度。`,
      ),
      confirmText: t("Continue", "继续"),
      input: {
        label: t("Quota per user", "每位用户增加的额度"),
        type: "number",
        min: 1,
        initialValue: batchTopupAmount || "100",
        placeholder: "100",
      },
    });
    if (!input) return;
    const value = Number(input);
    if (!Number.isInteger(value) || value <= 0) {
      const message = t(
        "Enter a positive integer quota amount.",
        "请输入大于 0 的整数额度。",
      );
      setError(message);
      toast.error({ message });
      return;
    }
    setBatchTopupAmount(input);
    setBatchWorking(true);
    setError(null);
    try {
      for (const id of selectedIds) {
        await api.manageUser({
          id: Number(id),
          action: "add_quota",
          mode: "add",
          value,
        });
      }
      setSelectedIds([]);
      const result = await api.users(page, search, userQuery);
      setUsers(result.items ?? []);
      setTotal(result.total ?? 0);
      toast.success({
        message: t(
          `Added ${value} credits to ${selectedIds.length} users`,
          `已为 ${selectedIds.length} 个用户各增加 ${value} 额度`,
        ),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to batch add quota.", "批量加额度失败。");
      setError(message);
      toast.error({ message });
    } finally {
      setBatchWorking(false);
    }
  }

  async function batchDelete() {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: t("Delete Users", "删除用户"),
      description: t(
        `Permanently delete ${selectedIds.length} users? This cannot be undone.`,
        `永久删除 ${selectedIds.length} 个用户？此操作不可恢复。`,
      ),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    setBatchWorking(true);
    setError(null);
    try {
      for (const id of selectedIds) {
        await api.deleteUser(Number(id));
      }
      const count = selectedIds.length;
      setSelectedIds([]);
      const result = await api.users(page, search, userQuery);
      setUsers(result.items ?? []);
      setTotal(result.total ?? 0);
      toast.success({
        message: t(`Deleted ${count} users`, `已删除 ${count} 个用户`),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to batch delete users.", "批量删除用户失败。");
      setError(message);
      toast.error({ message });
    } finally {
      setBatchWorking(false);
    }
  }

  function exportUserCsv() {
    const roleLabel = (role: number | undefined): string => {
      if (role === undefined || role === null) return "-";
      if (role >= 100) return t("Super Admin", "超级管理员");
      if (role >= 10) return t("Admin", "管理员");
      if (role >= 1) return t("User", "普通用户");
      return t("Guest", "访客");
    };
    const columns: CsvColumn<AdminUser>[] = [
      { key: "id", header: "ID" },
      { key: "username", header: "Username" },
      { key: "display_name", header: "Display Name" },
      { key: "email", header: "Email" },
      {
        key: "role",
        header: "Role",
        format: (v) => roleLabel(v as number),
      },
      {
        key: "status",
        header: "Status",
        format: (v) =>
          v === 1 ? "Active" : v === 2 ? "Disabled" : String(v ?? "-"),
      },
      {
        key: "quota",
        header: "Quota",
        format: (v) => String(v ?? 0),
      },
      {
        key: "used_quota",
        header: "Used Quota",
        format: (v) => String(v ?? 0),
      },
      { key: "group", header: "Group" },
      {
        key: "created_at",
        header: "Created",
        format: (v) => (v ? formatUserTime((v as number) * 1000) : "-"),
      },
    ];
    downloadCsv("user-audit.csv", users, columns);
    toast.success({
      message: t("CSV exported", "CSV 已导出"),
    });
  }

  const columns = [
    {
      key: "username",
      title: t("Identity", "身份"),
      render: (user: AdminUser) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border border-[#121110]/10">
            {user.role >= 10 ? (
              <Shield className="h-3.5 w-3.5" />
            ) : (
              <User className="h-3.5 w-3.5 text-[#121110]/40" />
            )}
          </div>
          <span>{user.display_name || user.username}</span>
        </div>
      ),
    },
    {
      key: "email",
      title: t("Email", "邮箱"),
      render: (user: AdminUser) => (
        <span className="font-mono text-caption text-[#121110]/50">
          {user.email || "-"}
        </span>
      ),
    },
    {
      key: "role",
      title: t("Role", "角色"),
      render: (user: AdminUser) => (
        <span className="font-mono text-caption uppercase">
          {user.role >= 10 ? t("Admin", "管理员") : t("User", "用户")}
        </span>
      ),
    },
    { key: "group", title: t("Group", "分组") },
    {
      key: "quota",
      title: t("Remaining quota", "剩余额度"),
      render: (user: AdminUser) => (
        <span className="font-mono text-caption">
          {user.quota - user.used_quota}
        </span>
      ),
    },
    {
      key: "status",
      title: t("Status", "状态"),
      render: (user: AdminUser) => (
        <span className="font-mono text-caption uppercase">
          {user.status === 1 ? t("Active", "活跃") : t("Disabled", "已禁用")}
        </span>
      ),
    },
    {
      key: "request_count",
      title: t("Requests", "请求数"),
      render: (user: AdminUser) => (
        <span className="font-mono text-caption">
          {(user.request_count ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "last_login_at",
      title: t("Last login", "最后登录"),
      render: (user: AdminUser) => (
        <span className="font-mono text-caption text-[#121110]/50">
          {formatUserTime(user.last_login_at)}
        </span>
      ),
    },
    {
      key: "created_at",
      title: t("Created", "注册时间"),
      render: (user: AdminUser) => (
        <span className="font-mono text-caption text-[#121110]/50">
          {formatUserTime(user.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (user: AdminUser) => (
        <div className="flex items-center gap-4 text-[#121110]/40">
          <button
            type="button"
            title={t("Top up", "充值")}
            onClick={() => setTopupUser(user)}
          >
            <Wallet className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("Edit", "编辑")}
            onClick={() => openEditor(user)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("Reset Passkey", "重置 Passkey")}
            onClick={() => void resetPasskey(user)}
          >
            <Fingerprint className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("Disable 2FA", "禁用 2FA")}
            onClick={() => void disableTwoFactor(user)}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={t("OAuth bindings", "OAuth 绑定")}
            onClick={() => void showOAuthBindings(user)}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {user.role < 100 && (
            <button
              type="button"
              title={
                user.status === 1
                  ? t("Disable user", "禁用用户")
                  : t("Enable user", "启用用户")
              }
              onClick={() =>
                void manageUserAction(
                  user,
                  user.status === 1 ? "disable" : "enable",
                )
              }
            >
              <Power className="h-3.5 w-3.5" />
            </button>
          )}
          {user.role < 100 && (
            <button
              type="button"
              title={
                user.role >= 10
                  ? t("Demote to user", "降级为普通用户")
                  : t("Promote to admin", "提升为管理员")
              }
              onClick={() =>
                void manageUserAction(
                  user,
                  user.role >= 10 ? "demote" : "promote",
                )
              }
            >
              <Shield className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            title={t("Delete", "删除")}
            onClick={() => void removeUser(user)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title={t("User Registry", "用户注册表")}
      subtitle={t(
        "Manage accounts, groups, quotas, and permissions.",
        "管理账户、分组、配额和权限。",
      )}
      isLoading={loading}
      error={error}
      onRetry={() => setPage(1)}
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadTwoFactorStats()}
            className="border border-[#121110]/20 px-4 py-3 text-overline font-mono uppercase"
          >
            {t("2FA statistics", "2FA 统计")}
          </button>
          {users.length > 0 && (
            <button
              type="button"
              onClick={exportUserCsv}
              className="flex items-center gap-2 border border-[#121110]/20 px-4 py-3 text-overline font-mono uppercase tracking-widest"
              title={t("Export user list to CSV", "导出用户列表为 CSV")}
            >
              <Download className="h-3.5 w-3.5" />
              {t("Export CSV", "导出 CSV")}
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-2 bg-inverse px-6 py-3 text-overline font-mono uppercase tracking-widest text-white"
            onClick={() => openEditor()}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("Add User", "添加用户")}
          </button>
        </div>
      }
    >
      {twoFactorStats !== null && (
        <pre className="mb-5 max-h-48 overflow-auto whitespace-pre-wrap break-all border border-[#121110]/10 bg-white p-4 font-mono text-caption">
          {JSON.stringify(twoFactorStats, null, 2)}
        </pre>
      )}
      <div className="mb-5 grid gap-3 border border-[#121110]/10 bg-white p-4 sm:grid-cols-3">
        <label className="space-y-1 text-overline font-mono uppercase">
          <span>{t("Group", "分组")}</span>
          <SelectMenu value={groupFilter} onChange={(value) => { setGroupFilter(value); setPage(1); }} options={[{ value: "", label: t("All groups", "所有分组") }, ...groups.map((group) => ({ value: group, label: group }))]} />
        </label>
        <label className="space-y-1 text-overline font-mono uppercase">
          <span>{t("Role", "角色")}</span>
          <SelectMenu value={roleFilter} onChange={(value) => { setRoleFilter(value); setPage(1); }} options={[{ value: "", label: t("All roles", "所有角色") }, { value: "1", label: t("User", "用户") }, { value: "10", label: t("Admin", "管理员") }]} />
        </label>
        <label className="space-y-1 text-overline font-mono uppercase">
          <span>{t("Status", "状态")}</span>
          <SelectMenu value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }} options={[{ value: "", label: t("All statuses", "所有状态") }, { value: "1", label: t("Active", "活跃") }, { value: "2", label: t("Disabled", "已禁用") }]} />
        </label>
      </div>
      <DataTable
        columns={columns}
        data={users}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder={t("Find by name or email...", "按名称或邮箱查找...")}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        batchActions={[
          {
            key: "batch-topup",
            label: batchWorking
              ? t("Working...", "处理中...")
              : t("Batch add quota", "批量加额度"),
            disabled: batchWorking || selectedIds.length === 0,
            onClick: () => void batchTopup(),
          },
          {
            key: "batch-delete",
            label: t("Delete", "删除"),
            variant: "danger",
            disabled: batchWorking || selectedIds.length === 0,
            onClick: () => void batchDelete(),
          },
        ]}
      />
      {editor !== undefined && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-inverse/40 p-6">
          <form
            onSubmit={saveUser}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-5 overflow-y-auto border border-[#121110]/10 bg-primary p-5 shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">
                {editor
                  ? t("Edit User", "编辑用户")
                  : t("Add User", "添加用户")}
              </h2>
              <button
                type="button"
                onClick={() => setEditor(undefined)}
                className="text-sm"
              >
                ×
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-micro font-mono uppercase sm:col-span-2">
                <span>{t("Display name", "显示名称")}</span>
                <input value={form.display_name} onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))} className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none" />
              </label>
              {(
                [
                  ["username", "Username", "用户名"],
                  ["password", "Password", "密码"],
                  ["email", "Email", "邮箱"],
                ] as const
              ).map(([key, en, zh]) => (
                <label
                  key={key}
                  className="space-y-1 text-micro font-mono uppercase"
                >
                  <span>{t(en, zh)}</span>
                  <input
                    required={
                      key === "username" || (key === "password" && !editor)
                    }
                    type={key === "password" ? "password" : "text"}
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                  />
                </label>
              ))}
              <label className="space-y-1 text-micro font-mono uppercase">
                <span>{t("Group", "分组")}</span>
                <SelectMenu value={form.group} onChange={(value) => setForm((current) => ({ ...current, group: value }))} options={[{ value: "", label: t("Select a group", "选择分组") }, ...[...new Set([...groups, ...(form.group ? [form.group] : [])])].map((group) => ({ value: group, label: group }))]} />
              </label>
              <label className="space-y-1 text-micro font-mono uppercase">
                <span>{t("Role", "角色")}</span>
                <SelectMenu value={String(form.role)} onChange={(value) => setForm((current) => ({ ...current, role: Number(value) }))} options={[{ value: "1", label: t("User", "用户") }, { value: "10", label: t("Admin", "管理员") }]} />
              </label>
              {!editor && (
                <label className="space-y-1 text-micro font-mono uppercase">
                  <span>{t("Initial quota", "初始额度")}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.quota}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        quota: Number(event.target.value),
                      }))
                    }
                    className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                  />
                </label>
              )}
              <label className="space-y-1 text-micro font-mono uppercase sm:col-span-2">
                <span>{t("Account note", "账户备注")}</span>
                <textarea value={form.setting} onChange={(event) => setForm((current) => ({ ...current, setting: event.target.value }))} rows={2} className="w-full border border-[#121110]/20 bg-transparent px-2 py-2 text-sm outline-none" />
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditor(undefined)}
                className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
              >
                {t("Cancel", "取消")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-inverse px-5 py-2 text-overline font-mono uppercase text-white"
              >
                {saving ? t("Saving...", "保存中...") : t("Save", "保存")}
              </button>
            </div>
          </form>
        </div>
      )}
      {topupUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-inverse/40 p-6">
          <form
            onSubmit={topUpUser}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-5 overflow-y-auto border border-[#121110]/10 bg-primary p-5 shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-8"
          >
            <h2 className="font-serif text-2xl">
              {t("Add quota", "增加额度")}
            </h2>
            <p className="text-label text-muted">{topupUser.username}</p>
            <input
              required
              type="number"
              min="1"
              step="1"
              value={topupAmount}
              onChange={(event) => setTopupAmount(event.target.value)}
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
              placeholder={t("Quota amount", "额度数量")}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTopupUser(null)}
                className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
              >
                {t("Cancel", "取消")}
              </button>
              <button
                type="submit"
                disabled={topupSaving}
                className="bg-inverse px-5 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
              >
                {topupSaving ? t("Saving...", "保存中...") : t("Add", "增加")}
              </button>
            </div>
          </form>
        </div>
      )}
      {oauthUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-inverse/40 p-6">
          <section className="max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-5 overflow-y-auto border border-[#121110]/10 bg-primary p-5 shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl">
                  {t("OAuth bindings", "OAuth 绑定")}
                </h2>
                <p className="mt-1 text-label text-muted">
                  {oauthUser.username}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOauthUser(null)}
                className="text-sm"
                aria-label={t("Close", "关闭")}
              >
                ×
              </button>
            </div>
            {oauthLoading ? (
              <p className="font-mono text-caption text-muted">
                {t("Loading...", "加载中...")}
              </p>
            ) : oauthBindings.length === 0 ? (
              <p className="font-mono text-caption text-muted">
                {t("No OAuth bindings.", "没有 OAuth 绑定。")}
              </p>
            ) : (
              <div className="divide-y divide-[#121110]/10 border-y border-[#121110]/10">
                {oauthBindings.map((binding) => (
                  <div
                    key={`${binding.provider_id}-${binding.provider_user_id}`}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm">
                        {binding.provider_name}
                      </p>
                      <p className="truncate font-mono text-caption text-muted">
                        {binding.provider_user_id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void unbindOAuth(binding)}
                      className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
                    >
                      {t("Unbind", "解绑")}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-3 border-t border-[#121110]/10 pt-4">
              <p className="text-overline font-mono uppercase tracking-widest text-muted">
                {t("Legacy bindings", "旧版绑定")}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ["email", "Email", "邮箱"],
                    ["github", "GitHub", "GitHub"],
                    ["discord", "Discord", "Discord"],
                    ["oidc", "OIDC", "OIDC"],
                    ["wechat", "WeChat", "微信"],
                    ["telegram", "Telegram", "Telegram"],
                    ["linuxdo", "LinuxDo", "LinuxDo"],
                  ] as const
                ).map(([key, en, zh]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void clearLegacyBinding(key, t(en, zh))}
                    className="border border-[#121110]/20 px-2 py-2 text-overline font-mono uppercase"
                  >
                    {t(en, zh)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOauthUser(null)}
                className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
              >
                {t("Close", "关闭")}
              </button>
            </div>
          </section>
        </div>
      )}
    </PageContainer>
  );
}
