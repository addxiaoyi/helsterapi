import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLang } from "../../lib/LanguageContext";
import {
  Shield,
  Key,
  Smartphone,
  AlertTriangle,
  Fingerprint,
  LogOut,
  CheckCircle2,
  X,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { api, type ApiSelfFingerprint, type ApiStatus, type ApiUserSession } from "../../lib/api";

function chatLink(template: string, token: string, address: string) {
  if (/\{[^}]+Config\}/.test(template)) return null;
  return template
    .replaceAll("{key}", encodeURIComponent(token))
    .replaceAll("{address}", address.replace(/\/$/, ""));
}

function decodeBase64Url(value: string) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = window.atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
}

function encodeBase64Url(value: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(value));
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getCurrentSessionFingerprint(): string | null {
  try {
    const userId = localStorage.getItem("new-api-user-id");
    if (!userId) return null;
    const trimmed = userId.trim();
    if (!trimmed) return null;
    return trimmed.length > 12
      ? `${trimmed.slice(0, 8)}…${trimmed.slice(-4)}`
      : trimmed;
  } catch {
    return null;
  }
}
export default function SecurityCenter() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLocked, setTwoFactorLocked] = useState(false);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState<
    number | null
  >(null);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [oauthBindings, setOauthBindings] = useState<
    Awaited<ReturnType<typeof api.oauthBindings>>
  >([]);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accessTokenSaving, setAccessTokenSaving] = useState(false);
  const [chatIntegrations, setChatIntegrations] = useState<
    Array<Record<string, string>>
  >([]);
  const [serviceStatus, setServiceStatus] = useState<ApiStatus>({});
  const [fingerprints, setFingerprints] = useState<ApiSelfFingerprint[]>([]);
  const [sessionFingerprint, setSessionFingerprint] = useState<string | null>(
    () => getCurrentSessionFingerprint(),
  );
  const [userSessions, setUserSessions] = useState<ApiUserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Defensive: read access_token from URL param, store in sessionStorage, and clear URL
  useEffect(() => {
    api.userSessions().then(setUserSessions).catch((cause) => {
      setDataError(cause instanceof Error ? cause.message : t("Unable to load sessions.", "无法加载会话列表。"));
    }).finally(() => setSessionsLoading(false));
  }, [t]);

  useEffect(() => {
    const token = searchParams.get("access_token");
    if (token) {
      try {
        sessionStorage.setItem("helstare-access-token", token);
      } catch {
        // storage may be full or disabled
      }
      // Remove token from URL without navigation
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("access_token");
      const newUrl = `${window.location.pathname}${newParams.size > 0 ? `?${newParams.toString()}` : ""}`;
      window.history.replaceState(null, "", newUrl);
    }
    // Load from sessionStorage on mount
    try {
      const stored = sessionStorage.getItem("helstare-access-token");
      if (stored) setAccessToken(stored);
    } catch {
      // storage may be unavailable
    }
  }, [searchParams]);
  useEffect(() => {
    api
      .twoFactorStatus()
      .then((status) => {
        setTwoFactorEnabled(status.enabled);
        setTwoFactorLocked(status.locked);
        setBackupCodesRemaining(
          typeof status.backup_codes_remaining === "number"
            ? status.backup_codes_remaining
            : null,
        );
      })
      .catch((cause) => {
        const message =
          cause instanceof Error
            ? cause.message
            : t("Unable to load security status.", "无法加载安全状态。");
        setTwoFactorError(message);
        toast.error({ message });
      });
    api
      .passkeyStatus()
      .then((status) => setPasskeyEnabled(status.enabled))
      .catch((cause) => {
        console.error("Unable to load Passkey status", cause);
        setDataError(
          cause instanceof Error
            ? cause.message
            : t("Unable to load Passkey status.", "无法加载 Passkey 状态。"),
        );
      });
    void api
      .oauthBindings()
      .then((bindings) =>
        setOauthBindings(Array.isArray(bindings) ? bindings : []),
      )
      .catch((cause) => {
        console.error("Unable to load OAuth bindings", cause);
        setDataError(
          cause instanceof Error
            ? cause.message
            : t("Unable to load OAuth bindings.", "无法加载 OAuth 绑定。"),
        );
      });
    void api
      .status()
      .then((status) => {
        setServiceStatus(status);
        setChatIntegrations(status.chats ?? []);
      })
      .catch((cause) => {
        console.error("Unable to load client integrations", cause);
        setDataError(
          cause instanceof Error
            ? cause.message
            : t("Unable to load client integrations.", "无法加载客户端集成。"),
        );
      });
    void api
      .userFingerprints()
      .then((items) => setFingerprints(Array.isArray(items) ? items : []))
      .catch((cause) => {
        console.error("Unable to load access fingerprints", cause);
        setDataError(
          cause instanceof Error
            ? cause.message
            : t("Unable to load access fingerprints.", "无法加载访问指纹。"),
        );
      });
  }, [t, toast]);
  async function openTwoFactor() {
    setTwoFactorError(null);
    setTwoFactorCode("");
    if (twoFactorEnabled && twoFactorLocked) {
      const message = t(
        "2FA is locked. Use a backup code or contact an administrator.",
        "2FA 已锁定，请使用备用码或联系管理员。",
      );
      setTwoFactorError(message);
      toast.error({ message });
      return;
    }
    if (twoFactorEnabled) {
      setTwoFactorOpen(true);
      return;
    }
    setTwoFactorSaving(true);
    try {
      const setup = await api.setupTwoFactor();
      const qrData = setup.qr_code_data;
      setQrCode(
        qrData.startsWith("data:") || qrData.startsWith("http")
          ? qrData
          : `data:image/png;base64,${qrData}`,
      );
      setBackupCodes(setup.backup_codes ?? []);
      setTwoFactorOpen(true);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to start 2FA setup.", "无法开始 2FA 配置。");
      setTwoFactorError(message);
      toast.error({ message });
    } finally {
      setTwoFactorSaving(false);
    }
  }

  async function submitTwoFactor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!twoFactorCode.trim()) return;
    setTwoFactorSaving(true);
    setTwoFactorError(null);
    try {
      if (twoFactorEnabled) await api.disableTwoFactor(twoFactorCode.trim());
      else await api.enableTwoFactor(twoFactorCode.trim());
      setTwoFactorEnabled((enabled) => !enabled);
      setTwoFactorLocked(false);
      setTwoFactorOpen(false);
      setQrCode(null);
      setBackupCodes([]);
      setBackupCodesRemaining(null);
      toast.success({
        message: twoFactorEnabled
          ? t("2FA disabled.", "2FA 已禁用。")
          : t("2FA enabled.", "2FA 已启用。"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to update 2FA.", "无法更新 2FA。");
      setTwoFactorError(message);
      toast.error({ message });
    } finally {
      setTwoFactorSaving(false);
    }
  }
  async function regenerateBackupCodes() {
    const code = await confirm({
      title: t("Regenerate backup codes", "重新生成备用码"),
      description: t(
        "Enter your authenticator code to regenerate backup codes.",
        "请输入身份验证器验证码以重新生成备用码。",
      ),
      confirmText: t("Regenerate", "重新生成"),
      variant: "default",
      input: {
        label: t("Authenticator code", "身份验证器验证码"),
        type: "text",
      },
    });
    if (!code?.trim()) return;
    setTwoFactorError(null);
    try {
      const response = await api.regenerateBackupCodes(code.trim());
      setBackupCodes(response.backup_codes ?? []);
      setBackupCodesRemaining(response.backup_codes?.length ?? 0);
      const message = t(
        "Backup codes regenerated. Store them securely.",
        "备用码已重新生成，请妥善保存。",
      );
      setSecurityMessage(message);
      toast.success({ message });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to regenerate backup codes.", "无法重新生成备用码。");
      setTwoFactorError(message);
      toast.error({ message });
    }
  }
  async function removePasskey() {
    const confirmed = await confirm({
      title: t("Remove Passkey?", "解绑 Passkey？"),
      description: t(
        "You will no longer be able to sign in with this Passkey.",
        "解绑后将无法再使用此 Passkey 登录。",
      ),
      confirmText: t("Remove", "解绑"),
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.deletePasskey();
      setPasskeyEnabled(false);
      const message = t("Passkey removed.", "Passkey 已解绑。");
      setSecurityMessage(message);
      toast.success({ message });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to remove Passkey.", "无法解绑 Passkey。");
      setSecurityMessage(message);
      toast.error({ message });
    }
  }
  async function generateAccessToken() {
    const confirmed = await confirm({
      title: t("Generate a new access token?", "生成新的访问令牌？"),
      description: t(
        "The current access token will be replaced. Copy the new token immediately; it will not be shown again.",
        "当前访问令牌将被替换。新令牌只显示这一次，请立即复制保存。",
      ),
      confirmText: t("Generate", "生成"),
      variant: "danger",
    });
    if (!confirmed) return;
    setAccessTokenSaving(true);
    try {
      const token = await api.generateAccessToken();
      setAccessToken(token);
      await navigator.clipboard.writeText(token);
      toast.success({
        message: t("New token generated and copied.", "新令牌已生成并复制。"),
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to generate access token.", "无法生成访问令牌。");
      setSecurityMessage(message);
      toast.error({ message });
    } finally {
      setAccessTokenSaving(false);
    }
  }
  async function registerPasskey() {
    if (!("PublicKeyCredential" in window) || !navigator.credentials?.create) {
      const message = t(
        "This browser does not support Passkeys.",
        "当前浏览器不支持 Passkey。",
      );
      setSecurityMessage(message);
      toast.error({ message });
      return;
    }
    setSecurityMessage(null);
    try {
      const begin = await api.passkeyRegisterBegin();
      const options = begin.options as PublicKeyCredentialCreationOptions & {
        challenge: string;
        user: PublicKeyCredentialUserEntity & { id: string };
      };
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: decodeBase64Url(options.challenge),
          user: { ...options.user, id: decodeBase64Url(options.user.id) },
          excludeCredentials: options.excludeCredentials?.map((item) => ({
            ...item,
            id: decodeBase64Url(item.id as unknown as string),
          })),
        },
      });
      if (!(credential instanceof PublicKeyCredential))
        throw new Error(
          t("Passkey creation was cancelled.", "Passkey 创建已取消。"),
        );
      const response = credential.response as AuthenticatorAttestationResponse;
      await api.passkeyRegisterFinish({
        id: credential.id,
        rawId: encodeBase64Url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: encodeBase64Url(response.clientDataJSON),
          attestationObject: encodeBase64Url(response.attestationObject),
        },
      });
      setPasskeyEnabled(true);
      const message = t("Passkey registered.", "Passkey 注册成功。");
      setSecurityMessage(message);
      toast.success({ message });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to register Passkey.", "无法注册 Passkey。");
      setSecurityMessage(message);
      toast.error({ message });
    }
  }
  async function deleteAccount() {
    const confirmed = await confirm({
      title: t("Delete account permanently?", "永久删除账户？"),
      description: t(
        "This will permanently delete your account and all data. This cannot be undone.",
        "将永久删除您的账户和所有数据，且无法恢复。",
      ),
      confirmText: t("Delete account", "删除账户"),
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.deleteSelf();
      toast.success({ message: t("Account deleted.", "账户已删除。") });
      navigate("/login", { replace: true });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to delete account.", "无法删除账户。");
      setSecurityMessage(message);
      toast.error({ message });
    }
  }
  async function signOutEverywhere() {
    const confirmed = await confirm({
      title: t("Sign out of all other sessions?", "退出所有其他会话？"),
      description: t(
        "Your current session will remain active.",
        "当前会话将保持登录。",
      ),
      confirmText: t("Sign out", "退出"),
      variant: "default",
    });
    if (!confirmed) return;
    setSigningOut(true);
    setSecurityMessage(null);
    try {
      await api.revokeOtherUserSessions();
      const message = t(
        "Other sessions have been revoked.",
        "其他会话已撤销。",
      );
      setSecurityMessage(message);
      toast.success({ message });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to revoke other sessions.", "无法撤销其他会话。");
      setSecurityMessage(message);
      toast.error({ message });
    } finally {
      setSigningOut(false);
    }
  }
  async function revokeSession(session: ApiUserSession) {
    if (session.current) return;
    const confirmed = await confirm({
      title: t("Revoke this session?", "撤销此会话？"),
      description: t("The device will need to sign in again.", "该设备需要重新登录。"),
      confirmText: t("Revoke", "撤销"),
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.revokeUserSession(session.id);
      setUserSessions((items) => items.filter((item) => item.id !== session.id));
      toast.success({ message: t("Session revoked.", "会话已撤销。") });
    } catch (cause) {
      toast.error({ message: cause instanceof Error ? cause.message : t("Unable to revoke session.", "无法撤销会话。") });
    }
  }
  return (
    <PageContainer
      title={t("Security Center", "安全中心")}
      subtitle={t(
        "Manage your authentication and access controls.",
        "管理您的身份验证与访问控制。",
      )}
    >
      {" "}
      {(twoFactorError || securityMessage || dataError) && !twoFactorOpen && (
        <div className="mb-6 border border-red-900/15 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {twoFactorError ?? securityMessage ?? dataError}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {" "}
        {/* Main Security Controls */}{" "}
        <div className="lg:col-span-2 space-y-6">
          {" "}
          <div className="bg-white border border-[#121110]/10 shadow-sm p-8">
            {" "}
            <div className="flex items-center gap-3 mb-8">
              {" "}
              <Shield
                className="w-5 h-5 text-[#121110]"
                strokeWidth={1.5}
              />{" "}
              <h3 className="text-lg font-serif text-[#121110]">
                {t("Authentication", "身份验证")}
              </h3>{" "}
            </div>{" "}
            <div className="space-y-6">
              {" "}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#121110]/10">
                {" "}
                <div>
                  {" "}
                  <h4 className="text-label font-medium text-[#121110] mb-1">
                    {t("Account Password", "账户密码")}
                  </h4>{" "}
                  <p className="text-[12px] text-muted">
                    {t(
                      "Password change time is not available.",
                      "暂无密码变更时间。",
                    )}
                  </p>{" "}
                </div>{" "}
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="bg-transparent border border-[#121110]/10 px-4 py-2 text-overline font-mono uppercase tracking-[0.1em] text-[#121110]"
                >
                  {" "}
                  {t("Update Password", "更新密码")}{" "}
                </button>{" "}
              </div>{" "}
              {chatIntegrations.length > 0 && (
                <div className="border-b border-[#121110]/10 pb-6">
                  <div className="mb-1">
                    <h4 className="text-label font-medium text-[#121110]">
                      {t("Desktop Client Import", "桌面客户端导入")}
                    </h4>
                    <p className="text-[12px] text-muted">
                      {t(
                        "Open a configured client with the generated API token.",
                        "使用已生成的 API 令牌打开已配置的客户端。",
                      )}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {chatIntegrations.flatMap((item) =>
                      Object.entries(item).map(([name, template]) => {
                        const link = accessToken
                          ? chatLink(
                              template,
                              accessToken,
                              serviceStatus.server_address ||
                                window.location.origin,
                            )
                          : null;
                        return link ? (
                          <a
                            key={name}
                            href={link}
                            className="inline-flex items-center gap-2 border border-[#121110]/15 px-3 py-2 text-overline font-mono uppercase tracking-[0.08em] text-[#121110] hover:border-[#121110]/50"
                          >
                            {name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span
                            key={name}
                            className="border border-dashed border-[#121110]/15 px-3 py-2 text-overline font-mono uppercase tracking-[0.08em] text-muted"
                            title={t(
                              "Generate a token first or configure this client format on the server.",
                              "请先生成令牌，或在服务端配置此客户端格式。",
                            )}
                          >
                            {name}
                          </span>
                        );
                      }),
                    )}
                  </div>
                </div>
              )}
              {fingerprints.length > 0 && (
                <div className="border-b border-[#121110]/10 pb-6">
                  <div className="mb-1">
                    <h4 className="text-label font-medium text-[#121110]">
                      {t("Recent Access Fingerprints", "最近访问指纹")}
                    </h4>
                    <p className="text-[12px] text-muted">
                      {t(
                        "Review the recent IP and browser identities used with this account.",
                        "查看此账户最近使用的 IP 和浏览器标识。",
                      )}
                    </p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {fingerprints.map((fingerprint) => (
                      <div
                        key={fingerprint.id}
                        className="border border-[#121110]/10 px-3 py-2 text-micro"
                      >
                        <div className="flex flex-wrap justify-between gap-2 font-mono text-[#121110]">
                          <span>{fingerprint.ip}</span>
                          <span className="text-muted">
                            {new Date(fingerprint.updated_at).toLocaleString()}
                          </span>
                        </div>
                        {fingerprint.user_agent && (
                          <p className="mt-1 break-all text-muted">
                            {fingerprint.user_agent}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#121110]/10">
                <div>
                  <h4 className="text-label font-medium text-[#121110] mb-1">
                    {t("API Access Token", "API 访问令牌")}
                  </h4>
                  <p className="text-[12px] text-muted">
                    {t(
                      "Generate a replacement token for API clients.",
                      "为 API 客户端生成替换令牌。",
                    )}
                  </p>
                  {accessToken && (
                    <code className="mt-3 block max-w-full break-all border border-amber-900/15 bg-amber-50 px-3 py-2 text-micro text-amber-900">
                      {accessToken}
                    </code>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void generateAccessToken()}
                  disabled={accessTokenSaving}
                  className="flex shrink-0 items-center gap-2 bg-inverse px-4 py-2 text-overline font-mono uppercase tracking-[0.1em] text-white disabled:opacity-50"
                >
                  {accessTokenSaving && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {t("Generate token", "生成令牌")}
                </button>
              </div>{" "}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#121110]/10">
                {" "}
                <div>
                  {" "}
                  <div className="flex items-center gap-2 mb-1">
                    {" "}
                    <h4 className="text-label font-medium text-[#121110]">
                      {t("Two-Factor Auth (2FA)", "两步验证 (2FA)")}
                    </h4>{" "}
                    {!twoFactorEnabled && (
                      <span className="bg-inverse/5 px-2 py-0.5 text-[9px] font-mono uppercase text-muted">
                        {t("Recommended", "推荐")}
                      </span>
                    )}{" "}
                  </div>{" "}
                  <p className="text-[12px] text-muted">
                    {t(
                      "Protect your account with an authenticator app.",
                      "使用身份验证器应用保护您的账户。",
                    )}
                  </p>{" "}
                  {twoFactorLocked && (
                    <p className="mt-2 text-micro text-red-600">
                      {t(
                        "This 2FA is locked after repeated failures.",
                        "多次验证失败后，2FA 已被锁定。",
                      )}
                    </p>
                  )}
                  {twoFactorEnabled && backupCodesRemaining !== null && (
                    <p
                      className={`mt-2 text-micro ${backupCodesRemaining === 0 ? "text-red-600" : "text-muted"}`}
                    >
                      {t("Backup codes remaining", "剩余备用码")}:{" "}
                      {backupCodesRemaining}
                    </p>
                  )}
                </div>{" "}
                <button
                  type="button"
                  onClick={() => void openTwoFactor()}
                  title={
                    twoFactorError ??
                    t(
                      "Use the setup flow to change 2FA.",
                      "请通过配置流程修改 2FA。",
                    )
                  }
                  className={`w-10 h-5 border flex items-center transition-colors duration-300 ease-out-expo ${twoFactorEnabled ? "border-[#121110] bg-inverse" : "border-[#121110]/20 bg-transparent"}`}
                >
                  {" "}
                  <div
                    className={`w-3 h-3 bg-white transition-all duration-300 ease-out-expo mx-1 ${twoFactorEnabled ? "translate-x-5" : "bg-inverse/40"}`}
                  />{" "}
                </button>{" "}
                {twoFactorEnabled && (
                  <button
                    type="button"
                    onClick={() => void regenerateBackupCodes()}
                    className="border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
                  >
                    {t("Regenerate codes", "重新生成备用码")}
                  </button>
                )}
              </div>{" "}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {" "}
                <div>
                  {" "}
                  <h4 className="text-label font-medium text-[#121110] mb-1">
                    {t("Passkeys (WebAuthn)", "通行密钥 (Passkey)")}
                  </h4>{" "}
                  <p className="text-[12px] text-muted">
                    {t(
                      "Sign in with biometric authentication or hardware keys.",
                      "使用生物特征或硬件密钥登录。",
                    )}
                  </p>{" "}
                </div>{" "}
                <button
                  type="button"
                  onClick={() =>
                    void (passkeyEnabled ? removePasskey() : registerPasskey())
                  }
                  className="bg-inverse text-[#FAFAFA] px-4 py-2 text-overline font-mono uppercase tracking-[0.1em]"
                >
                  {" "}
                  {passkeyEnabled
                    ? t("Passkey registered", "Passkey 已注册")
                    : t("Passkey not registered", "Passkey 未注册")}{" "}
                </button>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div className="bg-white border border-red-900/10 shadow-sm p-8">
            {" "}
            <div className="flex items-center gap-3 mb-6">
              {" "}
              <AlertTriangle
                className="w-5 h-5 text-red-600"
                strokeWidth={1.5}
              />{" "}
              <h3 className="text-lg font-serif text-red-600">
                {t("Danger Zone", "危险区域")}
              </h3>{" "}
            </div>{" "}
            <p className="text-[12px] text-muted mb-6">
              {" "}
              {t(
                "Once you delete your account, there is no going back. Please be certain.",
                "一旦您删除帐户，将无法恢复。请务必谨慎。",
              )}{" "}
            </p>
            <div className="border-t border-[#121110]/10 pt-3">
              <div className="mb-2 flex items-center justify-between text-overline font-mono uppercase tracking-widest text-muted">
                <span>{t("Active sessions", "活动会话")}</span>
                <span>{sessionsLoading ? "..." : userSessions.length}</span>
              </div>
              {sessionsLoading ? <p className="text-caption text-muted">{t("Loading sessions...", "正在加载会话...")}</p> : userSessions.length === 0 ? <p className="text-caption text-muted">{t("No active sessions.", "暂无活动会话。")}</p> : <ul className="space-y-2">{userSessions.map((session) => <li key={session.id} className="flex items-start justify-between gap-2 text-caption"><div className="min-w-0"><p className="truncate text-ink">{session.device_name}{session.current ? " (" + t("current", "当前") + ")" : ""}</p><p className="truncate text-micro text-muted">{session.ip} · {session.last_seen_at > 0 ? new Date(session.last_seen_at * 1000).toLocaleString() : "-"}</p></div>{!session.current && <button type="button" onClick={() => void revokeSession(session)} disabled={signingOut} className="shrink-0 text-micro text-red-700 hover:underline">{t("Revoke", "撤销")}</button>}</li>)}</ul>}
            </div>
            <button
              type="button"
              onClick={() => void deleteAccount()}
              className="bg-red-50 text-red-600 border border-red-100 px-4 py-2.5 text-caption font-medium"
            >
              {" "}
              {t("Delete Account", "删除账户")}{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        {/* Side Info */}{" "}
        <div className="space-y-6">
          {" "}
          <div className="bg-white border border-[#121110]/10 shadow-sm p-6">
            {" "}
            <div className="flex items-start justify-between mb-4">
              {" "}
              <div className="w-8 h-8 border border-[#121110]/10 flex items-center justify-center">
                {" "}
                <Smartphone
                  className="w-4 h-4 text-[#121110]"
                  strokeWidth={1.5}
                />{" "}
              </div>{" "}
              <span className="text-overline font-mono bg-inverse/5 px-2 py-1 text-muted">
                {t("This device", "本设备")}
              </span>{" "}
            </div>{" "}
            <h4 className="text-label font-medium text-[#121110] mb-1">
              {t("Trusted Sign-in Methods", "受信任的登录方式")}
            </h4>{" "}
            <p className="text-caption text-muted mb-4">
              {t(
                "Linked accounts and credentials that can access this account.",
                "可访问此账户的关联账户和凭据。",
              )}
            </p>{" "}
            <div className="space-y-3">
              {" "}
              <div className="flex items-center justify-between gap-3 text-[12px]">
                {" "}
                <div className="flex items-center gap-2 text-[#121110]">
                  {" "}
                  <Fingerprint
                    className={`w-3.5 h-3.5 ${passkeyEnabled ? "text-emerald-600" : "text-muted"}`}
                    strokeWidth={1.5}
                  />{" "}
                  <span>{t("Passkey", "Passkey")}</span>{" "}
                </div>{" "}
                {passkeyEnabled ? (
                  <span className="flex items-center gap-1 font-mono text-caption text-emerald-600">
                    {" "}
                    <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
                    {t("Enabled", "已启用")}{" "}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-mono text-caption text-muted">
                    {" "}
                    <XCircle className="w-3 h-3" strokeWidth={1.5} />
                    {t("Not registered", "未注册")}{" "}
                  </span>
                )}{" "}
              </div>{" "}
              <div className="flex items-center justify-between gap-3 text-[12px]">
                {" "}
                <div className="flex items-center gap-2 text-[#121110]">
                  {" "}
                  <Shield
                    className={`w-3.5 h-3.5 ${twoFactorEnabled ? "text-emerald-600" : "text-muted"}`}
                    strokeWidth={1.5}
                  />{" "}
                  <span>
                    {t("Authenticator (2FA)", "身份验证器 (2FA)")}
                  </span>{" "}
                </div>{" "}
                {twoFactorEnabled ? (
                  <span className="flex items-center gap-1 font-mono text-caption text-emerald-600">
                    {" "}
                    <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
                    {t("Enabled", "已启用")}{" "}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-mono text-caption text-muted">
                    {" "}
                    <XCircle className="w-3 h-3" strokeWidth={1.5} />
                    {t("Disabled", "未启用")}{" "}
                  </span>
                )}{" "}
              </div>{" "}
              <div className="border-t border-[#121110]/10 pt-3">
                {" "}
                <div className="flex items-center justify-between text-overline font-mono uppercase tracking-widest text-muted mb-2">
                  {" "}
                  <span>{t("OAuth providers", "OAuth 提供方")}</span>{" "}
                  <span>{oauthBindings.length}</span>{" "}
                </div>{" "}
                {oauthBindings.length === 0 ? (
                  <p className="text-[12px] text-muted">{t("None", "无")}</p>
                ) : (
                  <ul className="space-y-2">
                    {oauthBindings.map((binding) => (
                      <li
                        key={binding.provider_id}
                        className="flex items-center justify-between gap-2 text-[12px]"
                      >
                        <span className="text-[#121110]">
                          {binding.provider_name}
                        </span>
                        <span className="font-mono text-caption text-muted truncate max-w-[10rem]">
                          {binding.provider_user_id}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}{" "}
              </div>{" "}
              <div className="border-t border-[#121110]/10 pt-3">
                {" "}
                <div className="flex items-center justify-between text-overline font-mono uppercase tracking-widest text-muted">
                  {" "}
                  <span>{t("Current session", "当前会话")}</span>{" "}
                  <span className="text-[#121110] normal-case tracking-normal font-mono">
                    {sessionFingerprint ?? t("Unknown", "未知")}
                  </span>{" "}
                </div>{" "}
                <p className="mt-2 text-caption text-muted">
                  {t(
                    "Partial ID of the access token in use on this device.",
                    "本设备正在使用的访问令牌的部分 ID。",
                  )}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <button
              type="button"
              onClick={() => void signOutEverywhere()}
              disabled={signingOut}
              className="mt-5 flex w-full items-center justify-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase tracking-widest text-[#121110] disabled:opacity-50"
            >
              {" "}
              {signingOut ? (
                <Loader2
                  className="w-3.5 h-3.5 animate-spin"
                  strokeWidth={1.5}
                />
              ) : (
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              {signingOut
                ? t("Signing out...", "正在退出...")
                : t("Sign out all other sessions", "退出所有其他会话")}{" "}
            </button>{" "}
          </div>{" "}
          <div className="bg-white border border-[#121110]/10 shadow-sm p-6">
            {" "}
            <div className="flex items-start justify-between mb-4">
              {" "}
              <div className="w-8 h-8 border border-[#121110]/10 flex items-center justify-center">
                {" "}
                <Key
                  className="w-4 h-4 text-[#121110]"
                  strokeWidth={1.5}
                />{" "}
              </div>{" "}
            </div>{" "}
            <h4 className="text-label font-medium text-[#121110] mb-1">
              {t("OAuth Connections", "OAuth 绑定")}
            </h4>{" "}
            <div className="mt-4 space-y-3">
              {oauthBindings.length === 0 ? (
                <p className="text-[12px] text-muted">
                  {t("No connected accounts.", "暂无已连接账户。")}
                </p>
              ) : (
                oauthBindings.map((binding) => (
                  <div
                    key={binding.provider_id}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span className="text-[#121110]">
                      {binding.provider_name}
                    </span>
                    <span className="font-mono text-muted">
                      {binding.provider_user_id}
                    </span>
                  </div>
                ))
              )}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {twoFactorOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-inverse/40 p-6">
          <form
            onSubmit={submitTwoFactor}
            className="w-full max-w-md space-y-5 border border-[#121110]/10 bg-primary p-8 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">
                {twoFactorEnabled
                  ? t("Disable 2FA", "禁用 2FA")
                  : t("Set up 2FA", "配置 2FA")}
              </h2>
              <button type="button" onClick={() => setTwoFactorOpen(false)} aria-label={t("Close", "关闭")}>
                <X className="h-4 w-4" />
              </button>
            </div>
            {qrCode && (
              <img
                src={qrCode}
                alt={t("Authenticator QR code", "身份验证器二维码")}
                className="mx-auto h-48 w-48"
              />
            )}
            {backupCodes.length > 0 && (
              <div className="border border-[#121110]/10 bg-white p-4">
                <p className="mb-2 text-overline font-mono uppercase tracking-widest">
                  {t("Backup codes", "备用码")}
                </p>
                <p className="break-words font-mono text-[12px]">
                  {backupCodes.join(" ")}
                </p>
              </div>
            )}
            <input
              required
              value={twoFactorCode}
              onChange={(event) => setTwoFactorCode(event.target.value)}
              inputMode="numeric"
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
              placeholder={t("Authenticator code", "身份验证器验证码")}
            />
            {twoFactorError && (
              <p className="text-[12px] text-red-600">{twoFactorError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTwoFactorOpen(false)}
                className="border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase"
              >
                {t("Cancel", "取消")}
              </button>
              <button
                type="submit"
                disabled={twoFactorSaving}
                className="flex items-center gap-2 bg-inverse px-5 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
              >
                {twoFactorSaving && (
                  <Loader2
                    className="w-3.5 h-3.5 animate-spin"
                    strokeWidth={1.5}
                  />
                )}
                {twoFactorSaving
                  ? t("Saving...", "保存中...")
                  : t("Confirm", "确认")}
              </button>
            </div>
          </form>
        </div>
      )}
    </PageContainer>
  );
}
