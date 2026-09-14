import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type OAuthProvider = {
  id: number;
  provider: string;
  client_id?: string;
  auth_url?: string;
  scopes?: string[];
  enabled: boolean;
  allow_signup: boolean;
  auto_link?: string[];
  created_at?: number;
  updated_at?: number;
};

type ProviderMeta = {
  provider: string;
  name: string;
  auth_url_template?: string;
  token_url_template?: string;
  scopes_hint?: string[];
  fields?: { name: string; placeholder?: string; required?: boolean }[];
};

const BUILTIN_META: ProviderMeta[] = [
  {
    provider: "google",
    name: "Google",
    auth_url_template: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes_hint: ["openid", "email", "profile"],
  },
  {
    provider: "github",
    name: "GitHub",
    auth_url_template: "https://github.com/login/oauth/authorize",
    scopes_hint: ["read:user", "user:email"],
  },
  {
    provider: "apple",
    name: "Apple",
    auth_url_template: "https://appleid.apple.com/auth/authorize",
    scopes_hint: ["email", "name"],
    fields: [{ name: "team_id" }, { name: "key_id" }],
  },
  {
    provider: "microsoft",
    name: "Microsoft",
    auth_url_template: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scopes_hint: ["openid", "email", "profile", "User.Read"],
  },
  {
    provider: "discord",
    name: "Discord",
    auth_url_template: "https://discord.com/api/oauth2/authorize",
    scopes_hint: ["identify", "email"],
  },
  {
    provider: "slack",
    name: "Slack",
    auth_url_template: "https://slack.com/oauth/v2/authorize",
    scopes_hint: ["users:read", "users:read.email"],
  },
  {
    provider: "spotify",
    name: "Spotify",
    auth_url_template: "https://accounts.spotify.com/authorize",
    scopes_hint: ["user-read-email", "user-read-private"],
  },
  {
    provider: "gitlab",
    name: "GitLab",
    auth_url_template: "https://gitlab.com/oauth/authorize",
    scopes_hint: ["read_user", "email"],
  },
];

const blank = {
  provider: "",
  client_id: "",
  client_secret: "",
  auth_url: "",
  scopes: "",
  enabled: true,
  allow_signup: true,
};

export default function OAuthProviders() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [editing, setEditing] = useState<OAuthProvider | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // OIDC discovery: when set, a preview is shown next to the Auth URL field
  // and the fields can be auto-filled.
  const [discoveryUrl, setDiscoveryUrl] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<Record<string, unknown> | null>(null);

  // Expanded provider info
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.oauthProviders();
      setProviders(Array.isArray(data) ? data : []);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load OAuth providers.", "无法加载 OAuth 提供商。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  // Run OIDC discovery against the well-known URL and auto-fill endpoint
  // fields. This is the safest way to keep provider configs current and
  // avoids hand-typing issuer/token endpoints that often change silently.
  const runDiscovery = useCallback(async () => {
    const url = discoveryUrl.trim();
    if (!url) {
      toast.info({ message: t("Enter a discovery URL first.", "请先输入发现 URL。") });
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setFormError(t("Discovery URL must start with http:// or https://", "发现 URL 必须以 http:// 或 https:// 开头"));
      return;
    }
    setDiscovering(true);
    setFormError(null);
    try {
      const result = await api.discoverOAuth(url);
      setDiscoveryResult(result);
      // Auto-fill any endpoint the provider returned.
      const auth = String(result.authorization_endpoint ?? "");
      const token = String(result.token_endpoint ?? "");
      const user = String(result.userinfo_endpoint ?? "");
      setForm((current) => ({
        ...current,
        auth_url: auth || current.auth_url,
        // We don't have dedicated token/userinfo fields, so keep them in a
        // hidden JSON blob if the backend stores it. For now show the user
        // what we discovered and let them confirm.
      }));
      toast.success({
        message: t("Discovery complete. Review endpoints before saving.", "发现完成。请检查端点后再保存。"),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to fetch discovery document.", "无法获取发现文档。");
      setFormError(message);
      toast.error({ message });
    } finally {
      setDiscovering(false);
    }
  }, [discoveryUrl, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(p: OAuthProvider) {
    setEditing(p);
    setForm({
      provider: p.provider,
      client_id: p.client_id ?? "",
      client_secret: "",
      auth_url: p.auth_url ?? "",
      scopes: (p.scopes ?? []).join(" "),
      enabled: p.enabled,
      allow_signup: p.allow_signup,
    });
    setShowNew(true);
    setFormError(null);
  }

  function startNew() {
    setEditing(null);
    setForm({ ...blank });
    setShowSecret(true);
    setShowNew(true);
    setFormError(null);
  }

  function reset() {
    setEditing(null);
    setShowNew(false);
    setForm({ ...blank });
    setFormError(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        provider: form.provider.trim(),
        client_id: form.client_id.trim(),
        client_secret: form.client_secret || undefined,
        auth_url: form.auth_url.trim() || undefined,
        scopes: form.scopes
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean),
        enabled: form.enabled,
        allow_signup: form.allow_signup,
      };
      if (editing) {
        await api.updateOAuthProvider({ id: editing.id, ...body });
      } else {
        await api.createOAuthProvider(body);
      }
      toast.success({ message: t("Saved", "已保存") });
      reset();
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to save provider.", "无法保存提供商。");
      setFormError(message);
      toast.error({ message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: OAuthProvider) {
    const ok = await confirm({
      title: t("Delete provider", "删除提供商"),
      description: t("Delete this provider?", "确定删除此提供商吗？"),
      confirmText: t("Delete", "删除"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteOAuthProvider(p.id);
      toast.success({ message: t("Deleted", "已删除") });
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to delete provider.", "无法删除提供商。");
      setError(message);
      toast.error({ message });
    }
  }

  async function toggleEnabled(p: OAuthProvider) {
    try {
      await api.updateOAuthProvider({
        id: p.id,
        provider: p.provider,
        client_id: p.client_id ?? "",
        scopes: p.scopes ?? [],
        enabled: !p.enabled,
        allow_signup: p.allow_signup,
      });
      toast.success({
        message: p.enabled ? t("Disabled", "已禁用") : t("Enabled", "已启用"),
      });
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to toggle provider.", "无法切换提供商状态。");
      setError(message);
      toast.error({ message });
    }
  }

  function loadMeta(meta: ProviderMeta) {
    setForm({
      ...form,
      provider: meta.provider,
      auth_url: meta.auth_url_template ?? "",
      scopes: meta.scopes_hint?.join(" ") ?? "",
    });
  }

  function isMeta(provider: string) {
    return BUILTIN_META.find((m) => m.provider === provider);
  }

  function getEndpointStatus(p: OAuthProvider): {
    label: string;
    ok: boolean;
  } {
    if (!p.auth_url) return { label: "—", ok: false };
    try {
      const url = new URL(p.auth_url);
      return { label: url.hostname, ok: true };
    } catch {
      return { label: t("Invalid URL", "无效 URL"), ok: false };
    }
  }

  const columns = [
    {
      key: "expand",
      title: "",
      render: (p: OAuthProvider) => (
        <button
          type="button"
          onClick={() => setExpanded(expanded === p.id ? null : p.id)}
          className="text-muted hover:text-[#121110]"
        >
          {expanded === p.id ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      ),
    },
    {
      key: "provider",
      title: t("Provider", "提供商"),
      render: (p: OAuthProvider) => (
        <span className="font-mono text-[12px] font-medium">
          {p.provider}
        </span>
      ),
    },
    {
      key: "endpoint",
      title: t("Endpoint", "端点"),
      render: (p: OAuthProvider) => {
        const ep = getEndpointStatus(p);
        return (
          <span
            className={`flex items-center gap-1 font-mono text-caption ${
              ep.ok ? "text-green-600" : "text-muted"
            }`}
          >
            {ep.ok ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {ep.label}
          </span>
        );
      },
    },
    {
      key: "enabled",
      title: t("Enabled", "已启用"),
      render: (p: OAuthProvider) => (
        <button
          type="button"
          onClick={() => void toggleEnabled(p)}
          title={p.enabled ? t("Click to disable", "点击禁用") : t("Click to enable", "点击启用")}
          className={`flex h-5 w-10 items-center rounded-full px-0.5 transition-colors ${
            p.enabled ? "bg-green-500" : "bg-[#7A7772]/30"
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              p.enabled ? "translate-x-[20px]" : "translate-x-0"
            }`}
          />
        </button>
      ),
    },
    {
      key: "client_id",
      title: t("Client ID", "客户端 ID"),
      render: (p: OAuthProvider) => (
        <span className="font-mono text-caption text-muted">
          {p.client_id ? p.client_id.slice(0, 12) + "…" : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "",
      render: (p: OAuthProvider) => (
        <div className="flex items-center justify-end gap-3 text-muted">
          <button
            type="button"
            onClick={() => startEdit(p)}
            title={t("Edit", "编辑")}
            className="hover:text-[#121110]"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void remove(p)}
            title={t("Delete", "删除")}
            className="hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title={t("OAuth Providers", "OAuth 提供商")}
      subtitle={t(
        "Configure OAuth 2.0 / OIDC login providers.",
        "配置 OAuth 2.0 / OIDC 登录提供商。",
      )}
      isLoading={loading}
      error={error}
      onRetry={load}
      actions={
        <button
          type="button"
          onClick={startNew}
          className="flex items-center gap-1.5 bg-inverse px-3 py-1.5 text-overline font-mono uppercase text-white"
        >
          <Plus className="h-3 w-3" />
          {t("Add Provider", "添加提供商")}
        </button>
      }
    >
      {/* Built-in templates hint */}
      <div className="mb-4 border border-[#121110]/10 bg-primary p-3">
        <p className="mb-2 text-overline font-mono uppercase tracking-widest text-muted">
          {t("Quick templates", "快捷模板")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BUILTIN_META.map((m) => (
            <button
              key={m.provider}
              type="button"
              onClick={async () => {
                if (showNew && form.provider && form.provider !== m.provider) {
                  const ok = await confirm({
                    title: t("Switch template", "切换模板"),
                    description: t("Switch template?", "切换模板？"),
                    confirmText: t("Switch", "切换"),
                  });
                  if (!ok) return;
                }
                loadMeta(m);
              }}
              className="border border-[#121110]/20 px-2 py-1 text-micro font-mono hover:border-[#121110] hover:bg-white"
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* New / Edit form */}
      {showNew && (
        <form
          onSubmit={save}
          className="mb-6 border border-[#121110]/10 bg-white p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg">
              {editing
                ? t("Edit Provider", "编辑提供商")
                : t("New Provider", "新建提供商")}
            </h2>
            <button
              type="button"
              onClick={reset}
              className="text-muted hover:text-[#121110]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="mb-3 flex items-center gap-2 rounded border border-red-200 bg-red-50 p-2 text-[12px] text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                {t("Provider name", "提供商名称")}
              </label>
              <input
                required
                placeholder="google"
                value={form.provider}
                onChange={(e) =>
                  setForm({ ...form, provider: e.target.value })
                }
                className="w-full border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
              />
              <p className="mt-0.5 text-caption text-muted">
                {t("e.g. google, github, apple, discord", "如：google、github、apple、discord")}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                {t("Client ID", "客户端 ID")}
              </label>
              <input
                required
                placeholder={t("OAuth App Client ID", "OAuth 应用客户端 ID")}
                value={form.client_id}
                onChange={(e) =>
                  setForm({ ...form, client_id: e.target.value })
                }
                className="w-full border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-overline font-mono uppercase tracking-widest text-muted">
                <Key className="h-3 w-3" />
                {t("Client Secret", "客户端密钥")}
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  placeholder={
                    editing
                      ? t("(unchanged)", "（未更改）")
                      : t("OAuth App Client Secret", "OAuth 应用客户端密钥")
                  }
                  value={form.client_secret}
                  onChange={(e) =>
                    setForm({ ...form, client_secret: e.target.value })
                  }
                  className="w-full border-b border-[#121110]/20 bg-transparent p-2 pr-8 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-[#121110]"
                >
                  {showSecret ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {editing && (
                <p className="mt-0.5 text-caption text-muted">
                  {t("Leave empty to keep current secret.", "留空则保持当前密钥。")}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                {t("OIDC Discovery URL (optional)", "OIDC 发现 URL（可选）")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  placeholder="https://issuer.example.com/.well-known/openid-configuration"
                  value={discoveryUrl}
                  onChange={(event) => setDiscoveryUrl(event.target.value)}
                  className="flex-1 border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
                />
                <button
                  type="button"
                  disabled={discovering}
                  onClick={() => void runDiscovery()}
                  className="flex shrink-0 items-center gap-1.5 border border-[#121110]/20 px-3 py-1.5 text-overline font-mono uppercase tracking-widest text-[#121110] hover:border-[#121110] disabled:opacity-50"
                >
                  {discovering ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  {t("Discover", "发现")}
                </button>
              </div>
              {discoveryResult && (
                <div className="mt-2 grid gap-1 rounded border border-[#121110]/10 bg-primary p-2 text-micro font-mono text-muted">
                  {Boolean(discoveryResult.issuer) && (
                    <div>
                      <span className="text-[#121110]">issuer</span> = {String(discoveryResult.issuer)}
                    </div>
                  )}
                  {Boolean(discoveryResult.authorization_endpoint) && (
                    <div>
                      <span className="text-[#121110]">authorization_endpoint</span> = {String(discoveryResult.authorization_endpoint)}
                    </div>
                  )}
                  {Boolean(discoveryResult.token_endpoint) && (
                    <div>
                      <span className="text-[#121110]">token_endpoint</span> = {String(discoveryResult.token_endpoint)}
                    </div>
                  )}
                  {Boolean(discoveryResult.userinfo_endpoint) && (
                    <div>
                      <span className="text-[#121110]">userinfo_endpoint</span> = {String(discoveryResult.userinfo_endpoint)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                {t("Auth URL", "认证 URL")}
              </label>
              <input
                placeholder="https://.../authorize"
                value={form.auth_url}
                onChange={(e) =>
                  setForm({ ...form, auth_url: e.target.value })
                }
                className="w-full border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-overline font-mono uppercase tracking-widest text-muted">
                {t("Scopes (space-separated)", "权限范围（空格分隔）")}
              </label>
              <input
                placeholder="openid email profile"
                value={form.scopes}
                onChange={(e) =>
                  setForm({ ...form, scopes: e.target.value })
                }
                className="w-full border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
              />
            </div>
            <div className="flex items-center gap-6 md:col-span-2">
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm({ ...form, enabled: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#121110]"
                />
                <Shield className="h-3.5 w-3.5 text-muted" />
                {t("Enabled", "已启用")}
              </label>
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={form.allow_signup}
                  onChange={(e) =>
                    setForm({ ...form, allow_signup: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#121110]"
                />
                {t("Allow new signups", "允许新用户注册")}
              </label>
            </div>
          </div>

          {/* Endpoint preview */}
          {form.auth_url && (
            <div className="mt-3 flex items-center gap-2 rounded border border-[#121110]/10 bg-primary p-2">
              <span className="text-overline font-mono uppercase text-muted">
                {t("Endpoint:", "端点：")}
              </span>
              <span className="font-mono text-caption">{form.auth_url}</span>
              {(() => {
                try {
                  new URL(form.auth_url);
                  return <Check className="h-3 w-3 text-green-600" />;
                } catch {
                  return (
                    <span className="flex items-center gap-1 text-caption text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {t("Invalid URL", "无效 URL")}
                    </span>
                  );
                }
              })()}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-inverse px-4 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
            >
              {editing ? t("Update", "更新") : t("Create", "创建")}
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 text-overline font-mono uppercase text-muted"
            >
              {t("Cancel", "取消")}
            </button>
          </div>
        </form>
      )}

      {/* Providers table */}
      <DataTable
        columns={columns}
        data={providers}
        total={providers.length}
        page={1}
        pageSize={Math.max(providers.length, 10)}
        onPageChange={() => undefined}
      />

      {/* Expanded detail panel */}
      {expanded !== null && (() => {
        const p = providers.find((pr) => pr.id === expanded);
        if (!p) return null;
        const meta = isMeta(p.provider);
        const ep = getEndpointStatus(p);
        return (
          <div className="mt-4 border border-[#121110]/10 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-sm font-medium">{p.provider}</h3>
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="text-muted hover:text-[#121110]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 text-[12px] md:grid-cols-2">
              <DetailRow label={t("Provider", "提供商")} value={p.provider} />
              <DetailRow
                label={t("Client ID", "客户端 ID")}
                value={p.client_id ?? "—"}
                mono
              />
              <DetailRow
                label={t("Auth URL", "认证 URL")}
                value={p.auth_url ?? "—"}
                mono
                breakAll
              />
              <DetailRow
                label={t("Endpoint Status", "端点状态")}
                value={
                  <span className={ep.ok ? "text-green-600" : "text-red-600"}>
                    {ep.ok ? `✓ ${ep.label}` : `✗ ${ep.label}`}
                  </span>
                }
              />
              <DetailRow
                label={t("Scopes", "权限范围")}
                value={
                  p.scopes && p.scopes.length > 0
                    ? p.scopes.join(", ")
                    : "—"
                }
                mono
              />
              <DetailRow
                label={t("Enabled", "已启用")}
                value={p.enabled ? t("Yes", "是") : t("No", "否")}
              />
              <DetailRow
                label={t("Allow Signup", "允许注册")}
                value={p.allow_signup ? t("Yes", "是") : t("No", "否")}
              />
              {meta && (
                <DetailRow
                  label={t("Known Template", "已知模板")}
                  value={meta.name}
                />
              )}
            </div>
          </div>
        );
      })()}
    </PageContainer>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
  breakAll = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  breakAll?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-overline font-mono uppercase tracking-widest text-muted">
        {label}
      </span>
      <span
        className={`${mono ? "font-mono" : ""} ${breakAll ? "break-all" : ""} text-[12px]`}
      >
        {value}
      </span>
    </div>
  );
}
