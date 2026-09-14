import { useLang } from "../lib/LanguageContext";
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  Github,
  Loader2,
  Fingerprint,
} from "lucide-react";
import { useApp } from "../lib/AppContext";
import { ApiError, api } from "../lib/api";
import { useToast } from "../components/ui/Toast";

type AuthRedirectState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
  registered?: boolean;
};

function getRedirectTarget(location: ReturnType<typeof useLocation>) {
  const state = location.state as AuthRedirectState | null;
  const from = state?.from;
  const stateTarget = from?.pathname
    ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
    : "";
  const queryTarget = new URLSearchParams(location.search).get("redirect") ?? "";
  const target = stateTarget || queryTarget;

  if (!target.startsWith("/") || target.startsWith("//")) return "/dashboard";
  return target;
}

function decodeBase64Url(value: unknown): ArrayBuffer {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error("Passkey challenge is missing or invalid.");
	}
	const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = window.atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
}

function encodeBase64Url(value: ArrayBuffer): string {
  return window
    .btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
export default function Auth({
  defaultMode = "login",
}: {
  defaultMode?: "login" | "register";
}) {
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser, acceptUser, user, isLoading: sessionLoading } = useApp();
  const [mode, setMode] = useState(defaultMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [emailVerification, setEmailVerification] = useState(true);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [githubOAuth, setGithubOAuth] = useState(false);
  const [githubClientId, setGithubClientId] = useState("");
  const [serverAddress, setServerAddress] = useState("");
  const [otherOAuth, setOtherOAuth] = useState<
    Array<{ provider: string; label: string; path: string }>
  >([]);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean>();
  const [passwordLoginEnabled, setPasswordLoginEnabled] = useState(true);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const toast = useToast();
  // Guard against React StrictMode double-invoking async functions.
  const attemptRef = useRef(0);
  const registered = Boolean(
    (location.state as { registered?: boolean } | null)?.registered,
  );
  const redirectTarget = getRedirectTarget(location);

  useEffect(() => {
    if (sessionLoading || !user) return;
    navigate(redirectTarget, { replace: true });
  }, [navigate, redirectTarget, sessionLoading, user]);
  useEffect(() => {
    void api
      .status()
      .then((status) => {
        const enabled =
          status.register_enabled !== false &&
          status.password_register_enabled !== false;
        setEmailVerification(status.email_verification !== false);
        setTurnstileEnabled(Boolean(status.turnstile_check));
        setTurnstileSiteKey(status.turnstile_site_key ?? "");
        setGithubOAuth(Boolean(status.github_oauth));
        setGithubClientId(status.github_client_id ?? "");
        setServerAddress(status.server_address?.replace(/\/$/, "") ?? "");
        setOtherOAuth(
          [
            status.discord_oauth
              ? {
                  provider: "discord",
                  label: "Discord",
                  path: "/api/oauth/discord",
                }
              : null,
            status.linuxdo_oauth
              ? {
                  provider: "linuxdo",
                  label: "LinuxDO",
                  path: "/api/oauth/linuxdo",
                }
              : null,
            status.telegram_oauth
              ? {
                  provider: "telegram",
                  label: "Telegram",
                  path: "/api/oauth/telegram/login",
                }
              : null,
            status.wechat_login
              ? {
                  provider: "wechat",
                  label: "WeChat",
                  path: "/api/oauth/wechat",
                }
              : null,
            status.oidc_enabled
              ? {
                  provider: "oidc",
                  label: "OIDC",
                  path: "/api/oauth/oidc",
                }
              : null,
          ].filter(
            (item): item is { provider: string; label: string; path: string } =>
              item !== null,
          ),
        );
        setPasskeyEnabled(Boolean(status.passkey_login));
        setPasswordLoginEnabled(status.password_login_enabled !== false);
        setRegistrationEnabled(enabled);
        if (!enabled && mode === "register") setMode("login");
      })
      .catch((cause) => {
        console.error("Unable to load authentication configuration", cause);
        setError(
          cause instanceof Error
            ? cause.message
            : t("Unable to load authentication configuration.", "无法加载认证配置。"),
        );
        setGithubOAuth(false);
        setEmailVerification(true);
        setTurnstileEnabled(false);
        setTurnstileSiteKey("");
        setOtherOAuth([]);
        setPasswordLoginEnabled(true);
        setRegistrationEnabled(false);
        if (mode === "register") setMode("login");
      });
  }, [mode]);

  useEffect(() => {
    if (!turnstileEnabled || !turnstileSiteKey || !turnstileRef.current) return;
    const win = window as Window & {
      turnstile?: {
        render: (
          element: HTMLElement,
          options: {
            sitekey: string;
            callback: (token: string) => void;
            "expired-callback": () => void;
            "error-callback": () => void;
          },
        ) => unknown;
        remove?: (widgetId?: unknown) => void;
      };
    };
    let widgetId: unknown;
    let disposed = false;
    const render = () => {
      if (disposed || widgetId !== undefined || !win.turnstile || !turnstileRef.current) return;
      widgetId = win.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: setTurnstileToken,
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    };
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    if (existing) {
      render();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    }
    return () => {
      disposed = true;
      if (widgetId !== undefined) win.turnstile?.remove?.(widgetId);
      setTurnstileToken("");
    };
  }, [turnstileEnabled, turnstileSiteKey]);

  // Load saved username on mount
  useEffect(() => {
    const savedIdentifier = localStorage.getItem("saved_username");
    if (savedIdentifier) setIdentifier(savedIdentifier);
  }, []);

  const handleGithubLogin = async () => {
    if (!githubClientId) {
      // Fallback: server config didn't expose client_id, bail out
      toast.error({
        message: t(
          "GitHub login is unavailable: missing client_id.",
          "GitHub 登录暂不可用：缺少 client_id。",
        ),
      });
      return;
    }
    try {
      // 1) ask server to mint a state, store it in the session cookie
      const origin = serverAddress || window.location.origin;
      const state = await api.oauthState("github", origin);
      // 2) build the GitHub authorize URL with the same state, then jump
      const redirect = `${origin}/api/oauth/github`;
      const url =
        `https://github.com/login/oauth/authorize` +
        `?client_id=${encodeURIComponent(githubClientId)}` +
        `&redirect_uri=${encodeURIComponent(redirect)}` +
        `&scope=read%3Auser%20user%3Aemail` +
        `&state=${encodeURIComponent(state)}`;
      window.location.assign(url);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t(
              "Unable to start GitHub login.",
              "无法启动 GitHub 登录。",
            );
      toast.error({ message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login" && !passwordLoginEnabled) {
      setError(
        t("Password login is currently unavailable.", "密码登录当前不可用。"),
      );
      return;
    }
    if (mode === "register" && registrationEnabled !== true) {
      setError(
        t("Registration is currently unavailable.", "当前暂不开放注册。"),
      );
      return;
    }
    if (mode === "register" && !(privacyPolicyAccepted && termsAccepted)) {
      setError(
        t(
          "Please accept the Privacy Policy and Terms of Service.",
          "请同意隐私政策和服务条款。",
        ),
      );
      return;
    }
    if (turnstileEnabled && !turnstileToken) {
      setError(t("Please complete the security check.", "请完成安全验证。"));
      return;
    }
    setLoading(true);
    setError(null);
    // Bump the attempt id; any in-flight handler that resolves later will
    // see a mismatch and bail out instead of clobbering the newer attempt's
    // state. This guards against React 18 StrictMode's double-invoke.
    const attemptId = ++attemptRef.current;
    try {
      let user: import("../lib/api").ApiUser | null = null;
      if (mode === "login") {
        const loginIdentifier = identifier.trim().replace(/\\@/g, "@");
        const login = (await api.login(loginIdentifier, password, turnstileToken || undefined)) as {
          require_2fa?: boolean;
        } & Partial<import("../lib/api").ApiUser>;
        if (login.require_2fa) {
          navigate("/otp");
          return;
        }
        if (login.id && login.username) {
          localStorage.setItem("new-api-user-id", String(login.id));
        }
      } else {
        await api.register(
          identifier,
          password,
          email,
          verificationCode,
          turnstileToken || undefined,
        );
        navigate("/login", { replace: true, state: { registered: true } });
        return;
      }
      user = await refreshUser();
      if (!user) throw new Error("登录状态未建立，请检查服务端会话配置。");
      acceptUser(user);
      navigate(redirectTarget, { replace: true });
    } catch (cause) {
      // Discard responses from stale attempts (e.g. React 18 StrictMode
      // double-invoking the handler in dev). Only the most recent attempt
      // may update the UI.
      if (attemptId !== attemptRef.current) return;
      // Map backend error.code → i18n string. The message may already be
      // localised (backend runs go-i18n) but we deliberately use the code
      // as the source of truth so EN/ZH switches don't show stale strings.
      const code = cause instanceof ApiError ? cause.code : undefined;
      const raw = cause instanceof Error ? cause.message : "";
      let display: string;
      switch (code) {
        case "invalid_credentials":
          display = t(
            "Username or password incorrect, or user has been banned",
            "用户名或密码错误，或用户已被封禁",
          );
          break;
        case "login_disabled":
          display = t(
            "Password login is currently unavailable.",
            "密码登录当前不可用。",
          );
          break;
        case "login_db_error":
          display = t(
            "Unable to load accounts, please try again later.",
            "无法加载账户，请稍后重试。",
          );
          break;
        case "login_invalid_params":
          display = t(
            "Username and password are required.",
            "用户名和密码必填。",
          );
          break;
        case "turnstile_required":
          display = t(
            "Please complete the security check.",
            "请先完成安全验证。",
          );
          break;
        case "turnstile_failed":
          display = t(
            "Security verification expired or failed. Please verify again.",
            "安全验证已失效或失败，请重新验证。",
          );
          break;
        case "turnstile_unavailable":
          display = t(
            "Security verification is temporarily unavailable. Please try again later.",
            "安全验证服务暂时不可用，请稍后重试。",
          );
          break;
        case "login_failed":
          display = t(
            "Login failed, please try again later.",
            "登录失败，请稍后重试。",
          );
          break;
        default:
          // Fallback for old backends (no `code` field) or unexpected errors.
          // Try to recognise the legacy English message and translate it.
          if (
            raw ===
              "Username or password is incorrect, or user has been banned" ||
            raw.includes("username or password")
          ) {
            display = t(
              "Username or password incorrect, or user has been banned",
              "用户名或密码错误，或用户已被封禁",
            );
          } else {
            // Last-resort fallback: only show raw string in dev; otherwise a
            // generic message to avoid leaking internal details to the user.
            display =
              import.meta.env.DEV && raw
                ? raw
                : t(
                    "Login failed, please try again later.",
                    "登录失败，请稍后重试。",
                  );
          }
      }
      setError(display);
    } finally {
      setLoading(false);
      // Save username if "Remember me" is checked
      if (mode === "login" && rememberMe && identifier) {
        localStorage.setItem("saved_username", identifier);
      } else {
        localStorage.removeItem("saved_username");
      }
    }
  };
  const handlePasskeyLogin = async () => {
    if (!("PublicKeyCredential" in window) || !navigator.credentials?.get) {
      setError(
        t(
          "This browser does not support Passkeys.",
          "当前浏览器不支持 Passkey。",
        ),
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const begin = await api.passkeyLoginBegin();
      const options = begin.options;
      const credential = await navigator.credentials.get({
        publicKey: {
          ...options,
          challenge: decodeBase64Url(options.challenge),
          allowCredentials: options.allowCredentials?.map((item) => ({
            ...item,
            id: decodeBase64Url(item.id as unknown as string),
          })),
        },
      });
      if (!(credential instanceof PublicKeyCredential))
        throw new Error(
          t("Passkey login was cancelled.", "Passkey 登录已取消。"),
        );
      const response = credential.response as AuthenticatorAssertionResponse;
      await api.passkeyLoginFinish({
        id: credential.id,
        rawId: encodeBase64Url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: encodeBase64Url(response.clientDataJSON),
          authenticatorData: encodeBase64Url(response.authenticatorData),
          signature: encodeBase64Url(response.signature),
          userHandle: response.userHandle
            ? encodeBase64Url(response.userHandle)
            : null,
        },
      });
      const user = await refreshUser();
      if (!user)
        throw new Error(
          t("Login session was not established.", "登录状态未建立。"),
        );
      acceptUser(user);
      navigate(redirectTarget, { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("Passkey login failed.", "Passkey 登录失败。"),
      );
    } finally {
      setLoading(false);
    }
  };
  const sendVerificationCode = async () => {
    if (!email.trim()) {
      setError(t("Enter your email first.", "请先填写邮箱。"));
      return;
    }
    setSendingCode(true);
    setError(null);
    try {
      await api.sendEmailVerification(
        email.trim(),
        turnstileToken || undefined,
      );
      setError(t("Verification code sent.", "验证码已发送。"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("Unable to send verification code.", "验证码发送失败。"),
      );
    } finally {
      setSendingCode(false);
    }
  };
  return (
    <div className="min-h-screen flex selection:bg-inverse selection:text-[#FAFAFA] bg-primary">
      {" "}
      {/* Left Column: Artistic Manifesto */}{" "}
      <div className="hidden lg:flex flex-1 relative border-r border-[#121110]/5 flex-col justify-between p-16 overflow-hidden">
        {" "}
        <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-50" />{" "}
        <div className="relative z-10">
          {" "}
          <div className="w-10 h-10 bg-inverse flex items-center justify-center">
            {" "}
            <span className="text-[#FAFAFA] font-serif font-bold text-xl leading-none">
              H
            </span>{" "}
          </div>{" "}
        </div>{" "}
        <div className="relative z-10 max-w-md">
          {" "}
          <h2 className="text-4xl font-serif text-[#121110] leading-[1.1] mb-6">
            {" "}
            {t("Where raw compute", "在绝对的纯粹中")} <br />{" "}
            {t("meets absolute ", "遇见极致的")}
            <span className="italic">{t("clarity", "算力")}</span>.{" "}
          </h2>{" "}
          <p className="text-label text-muted font-sans leading-relaxed text-justify">
            {" "}
            {t(
              "Access the world's most powerful AI models through a singular, elegant interface. We strip away the noise, leaving only pure, uninterrupted performance and meticulous control.",
              "通过单一、优雅的界面访问全球最强大的 AI 模型。我们剔除噪音，只保留纯粹、不间断的性能和细致入微的控制。",
            )}{" "}
          </p>{" "}
        </div>{" "}
        <div className="relative z-10 text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/40">
          {" "}
          {t("System Authentication / Secure", "系统认证 / 安全环境")}{" "}
        </div>{" "}
      </div>{" "}
      {/* Right Column: Minimalist Form */}{" "}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 relative overflow-y-auto">
        {" "}
        <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          {" "}
          <div className="mb-12">
            {" "}
            <h1 className="text-2xl font-serif text-[#121110] mb-2">
              {" "}
              {mode === "login"
                ? t("Sign In", "登入系统")
                : t("Create Account", "创建账户")}{" "}
            </h1>{" "}
            <p className="text-[12px] text-muted">
              {" "}
              {mode === "login"
                ? t(
                    "Enter your credentials to access the OS.",
                    "输入您的凭证以访问系统。",
                  )
                : t(
                    "Join the gateway to orchestrate your models.",
                    "加入网关，编排您的模型。",
                  )}{" "}
            </p>{" "}
          </div>{" "}
          <form onSubmit={handleSubmit} className="space-y-6">
            {" "}
            {registered && !error && (
              <div className="border-l-2 border-green-700 bg-green-50/50 p-3 text-[12px] text-green-700">
                {t(
                  "Account created. Sign in to continue.",
                  "账号已创建，请登录继续。",
                )}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50/50 text-red-600 text-[12px] font-medium border-l-2 border-red-600">
                {" "}
                {error}{" "}
              </div>
            )}{" "}
            {turnstileEnabled && turnstileSiteKey && (
              <div ref={turnstileRef} className="min-h-[65px]" />
            )}
            {mode === "register" && (
              <>
                {emailVerification && (
                  <div className="space-y-2">
                    <label className="text-overline font-mono uppercase tracking-[0.1em] text-[#121110]/60">
                      {t("Email", "邮箱")}
                    </label>
                    <input
                      type="email"
                      required={mode === "register"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-[#121110]/10 py-2.5 px-3 text-body text-[#121110] rounded-none focus-visible:ring-2 focus-visible:ring-[#121110]/30 focus-visible:border-[#121110] outline-none transition-all duration-300 ease-out-expo placeholder:text-[#121110]/20"
                    />
                  </div>
                )}
                {emailVerification && (
                  <div className="space-y-2">
                    <label className="text-overline font-mono uppercase tracking-[0.1em] text-[#121110]/60">
                      {t("Verification code", "验证码")}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="min-w-0 flex-1 bg-white border border-[#121110]/10 py-2.5 px-3 text-body text-[#121110] rounded-none focus-visible:ring-2 focus-visible:ring-[#121110]/30 focus-visible:border-[#121110] outline-none transition-all duration-300 ease-out-expo placeholder:text-[#121110]/20"
                      />
                      <button
                        type="button"
                        onClick={sendVerificationCode}
                        disabled={sendingCode || !email.trim()}
                        className="border border-[#121110]/10 px-3 text-caption disabled:opacity-50"
                      >
                        {sendingCode
                          ? t("Sending", "发送中")
                          : t("Send code", "发送验证码")}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="space-y-2">
              {" "}
              <label className="text-overline font-mono uppercase tracking-[0.1em] text-[#121110]/60">
                {t("Username / Email", "用户名 / 邮箱")}
              </label>{" "}
              <div className="relative">
                {" "}
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t(
                    "Enter username or email",
                    "请输入用户名或邮箱",
                  )}
                  className="w-full bg-white border border-[#121110]/10 focus:border-[#121110] focus:ring-1 focus:ring-[#121110] py-2.5 px-3 text-body text-[#121110] outline-none transition-all duration-300 ease-out-expo placeholder:text-[#121110]/20 shadow-sm focus:shadow-md rounded-none focus-visible:ring-2 focus-visible:ring-[#121110]/30"
                />{" "}
              </div>{" "}
            </div>{" "}
            {mode === "login" && (
              <div className="flex items-center space-x-2 mb-4">
                {" "}
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#121110] bg-white border-[#121110]/30 rounded focus:ring-0 focus:ring-offset-0"
                />{" "}
                <label
                  htmlFor="remember-me"
                  className="text-[12px] text-muted cursor-pointer"
                >
                  {t("Remember username", "记住用户名")}
                </label>{" "}
              </div>
            )}{" "}
            <div className="space-y-2">
              {" "}
              <div className="flex justify-between items-end">
                {" "}
                <label className="text-overline font-mono uppercase tracking-[0.1em] text-[#121110]/60">
                  {t("Password", "密码")}
                </label>{" "}
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="text-caption font-medium text-muted hover:text-[#121110] transition-colors"
                  >
                    {" "}
                    {t("Reset?", "忘记密码？")}{" "}
                  </button>
                )}{" "}
              </div>{" "}
              <div className="relative">
                {" "}
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("Enter password", "请输入密码")}
                  className="w-full bg-white border border-[#121110]/10 focus:border-[#121110] focus:ring-1 focus:ring-[#121110] py-2.5 px-3 text-body text-[#121110] outline-none transition-all duration-300 ease-out-expo placeholder:text-[#121110]/20 shadow-sm focus:shadow-md rounded-none focus-visible:ring-2 focus-visible:ring-[#121110]/30"
                />{" "}
              </div>{" "}
            </div>{" "}
            {mode === "register" && (
              <div className="space-y-3 mt-4">
                {" "}
                <div className="flex items-start space-x-3">
                  {" "}
                  <input
                    type="checkbox"
                    id="privacy-policy"
                    checked={privacyPolicyAccepted}
                    onChange={(e) => setPrivacyPolicyAccepted(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-[#121110] bg-white border-[#121110]/30 rounded focus:ring-0 focus:ring-offset-0 flex-shrink-0"
                  />{" "}
                  <label
                    htmlFor="privacy-policy"
                    className="text-[12px] text-muted leading-relaxed cursor-pointer"
                  >
                    {t("I agree to the", "同意")}
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/privacy", {
                          state: { from: location.pathname },
                        })
                      }
                      className="text-[#121110] font-medium hover:text-[#121110]/70 transition-colors mx-1"
                    >
                      {t("Privacy Policy", "隐私政策")}
                    </button>
                    {t("and", "和")}
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/terms", {
                          state: { from: location.pathname },
                        })
                      }
                      className="text-[#121110] font-medium hover:text-[#121110]/70 transition-colors mx-1"
                    >
                      {t("Terms of Service", "服务条款")}
                    </button>
                  </label>{" "}
                </div>{" "}
                <div className="flex items-start space-x-3">
                  {" "}
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-[#121110] bg-white border-[#121110]/30 rounded focus:ring-0 focus:ring-offset-0 flex-shrink-0"
                  />{" "}
                  <label
                    htmlFor="terms"
                    className="text-[12px] text-muted leading-relaxed cursor-pointer"
                  >
                    {t(
                      "I have read and agree to the above terms",
                      "我已阅读并同意上述条款",
                    )}
                  </label>{" "}
                </div>{" "}
              </div>
            )}{" "}
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-inverse text-[#FAFAFA] py-3.5 mt-8 font-medium text-[12px] uppercase tracking-widest hover:bg-black transition-all duration-300 active:scale-[0.98] ease-out-expo flex items-center justify-center gap-3 group disabled:opacity-70 rounded-none"
            >
              {" "}
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "login" ? (
                t("Authenticate", "身份验证")
              ) : (
                t("Initialize", "初始化账户")
              )}{" "}
              {!loading && (
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              )}{" "}
            </button>{" "}
          </form>{" "}
          {mode === "login" && passkeyEnabled && (
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-3 bg-transparent border border-[#121110]/10 py-3 text-[12px] font-medium hover:border-[#121110]/30 transition-all disabled:opacity-60 rounded-none"
            >
              <Fingerprint className="w-4 h-4" />
              {t("Sign in with Passkey", "使用 Passkey 登录")}
            </button>
          )}{" "}
          {(githubOAuth || otherOAuth.length > 0) && (
            <>
              {/* Minimalist Divider */}{" "}
              <div className="my-10 flex items-center gap-4">
                {" "}
                <div className="h-px bg-inverse/10 flex-1" />{" "}
                <span className="text-overline font-mono uppercase tracking-widest text-[#121110]/40">
                  {t("OR", "或")}
                </span>{" "}
                <div className="h-px bg-inverse/10 flex-1" />{" "}
              </div>{" "}
              {githubOAuth && (
                <button
                  type="button"
                  onClick={() => void handleGithubLogin()}
                  className="w-full flex items-center justify-center gap-3 bg-transparent border border-[#121110]/10 py-3 text-[12px] font-medium hover:border-[#121110]/30 transition-all duration-300 active:scale-[0.98] ease-out-expo rounded-none"
                >
                  {" "}
                  <Github className="w-4 h-4" />{" "}
                  {t("Continue with GitHub", "使用 GitHub 继续")}{" "}
                </button>
              )}
              {otherOAuth.map((provider) => (
                <button
                  key={provider.provider}
                  type="button"
                  onClick={() => window.location.assign(provider.path)}
                  className="mt-3 w-full flex items-center justify-center gap-3 bg-transparent border border-[#121110]/10 py-3 text-[12px] font-medium hover:border-[#121110]/30 transition-all duration-300 active:scale-[0.98] ease-out-expo rounded-none"
                >
                  {t(
                    "Continue with " + provider.label,
                    "使用 " + provider.label + " 继续",
                  )}
                </button>
              ))}
            </>
          )}{" "}
          {/* Toggle */}{" "}
          {registrationEnabled && (
            <p className="text-center mt-12 text-[12px] text-muted">
              {" "}
              {mode === "login"
                ? t("Require access?", "需要访问权限？")
                : t("Already registered?", "已注册账户？")}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="ml-2 font-medium text-[#121110] hover:text-[#121110]/70 transition-colors"
              >
                {" "}
                {mode === "login"
                  ? t("Request Account", "申请账户")
                  : t("Sign In", "登入系统")}{" "}
              </button>{" "}
            </p>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
