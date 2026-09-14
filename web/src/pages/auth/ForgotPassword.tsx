import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, LockKeyhole, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

export default function ForgotPassword() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void api.status().then((status) => {
      setTurnstileEnabled(Boolean(status.turnstile_check));
      setTurnstileSiteKey(status.turnstile_site_key ?? "");
    }).catch(() => {
      setTurnstileEnabled(false);
      setTurnstileSiteKey("");
    });
  }, []);

  useEffect(() => {
    if (!turnstileEnabled || !turnstileSiteKey || !turnstileRef.current) return;
    const win = window as Window & {
      turnstile?: {
        render: (element: HTMLElement, options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        }) => unknown;
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
    if (existing) render();
    else {
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (turnstileEnabled && !turnstileToken) {
      setError(t("Please complete the security check.", "请完成安全验证。"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.requestPasswordReset(email.trim(), turnstileToken || undefined);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Unable to send reset email.", "无法发送重置邮件。"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f1efe9] px-4 py-5 text-[#121110] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col overflow-hidden border border-[#121110]/10 bg-white sm:min-h-[calc(100vh-4rem)]">
        <header className="flex items-center justify-between border-b border-[#121110]/10 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3"
            aria-label={t("Go to home", "返回首页")}
          >
            <span className="flex h-8 w-8 items-center justify-center bg-[#121110] font-serif text-lg font-bold text-white">H</span>
            <span className="font-pixel text-base tracking-[0.08em]">Helstare</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 text-overline font-mono uppercase tracking-widest text-[#121110]/55 transition-colors hover:text-[#121110]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("Back to sign in", "返回登录")}
          </button>
        </header>

        <div className="grid flex-1 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="relative flex flex-col justify-between overflow-hidden bg-[#121110] px-7 py-10 text-white sm:px-12 sm:py-14 lg:min-h-[620px]">
            <div className="pointer-events-none absolute right-8 top-8 h-24 w-24 border border-white/20 sm:right-12 sm:top-12 sm:h-32 sm:w-32" aria-hidden="true" />
            <div className="pointer-events-none absolute bottom-10 right-16 h-12 w-12 border-l border-t border-white/15" aria-hidden="true" />
            <div className="relative max-w-lg">
              <div className="mb-12 flex items-center gap-3 text-overline font-mono uppercase tracking-[0.24em] text-white/55">
                <LockKeyhole className="h-4 w-4" />
                {t("Account recovery", "账户恢复")}
              </div>
              <h1 className="max-w-md font-serif text-5xl font-medium leading-[0.96] tracking-normal sm:text-6xl">
                {t("Reset your password.", "重置你的密码。")}
              </h1>
              <p className="mt-7 max-w-md text-sm leading-7 text-white/65">
                {t(
                  "A secure link will be sent to the email associated with your account.",
                  "我们会向账户绑定邮箱发送安全重置链接。",
                )}
              </p>
            </div>

            <div className="relative mt-16 max-w-md border-t border-white/15 pt-6">
              <p className="mb-5 text-overline font-mono uppercase tracking-[0.2em] text-white/45">{t("Recovery flow", "恢复流程")}</p>
              <ol className="space-y-5">
                <li className="flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/25 font-mono text-micro">01</span>
                  <span className="pt-1 text-sm text-white/75">{t("Confirm your account email", "确认账户邮箱")}</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/25 font-mono text-micro">02</span>
                  <span className="pt-1 text-sm text-white/75">{t("Open the time-limited link", "打开限时重置链接")}</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/25 font-mono text-micro">03</span>
                  <span className="pt-1 text-sm text-white/75">{t("Sign in with your new password", "使用新密码登录")}</span>
                </li>
              </ol>
            </div>

            <div className="relative mt-12 flex items-center gap-3 border-t border-white/15 pt-5 text-micro text-white/45">
              <ShieldCheck className="h-4 w-4" />
              {t("Your account details stay private.", "你的账户信息将保持私密。")}
            </div>
          </section>

          <section className="flex items-center px-7 py-10 sm:px-12 sm:py-14">
            <div className="w-full max-w-md">
              {sent ? (
                <div className="space-y-7">
                  <div className="flex h-14 w-14 items-center justify-center border border-[#047857]/25 bg-[#047857]/8 text-[#047857]">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="mb-3 text-overline font-mono uppercase tracking-[0.2em] text-[#047857]">{t("Request received", "请求已提交")}</p>
                    <h2 className="font-serif text-4xl font-medium leading-tight">{t("Check your inbox.", "请检查你的邮箱。")}</h2>
                    <p className="mt-4 text-sm leading-7 text-[#121110]/60">
                      {t("If the account exists, a reset link has been sent.", "如果账户存在，重置链接已发送。")}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 border-y border-[#121110]/10 py-4 text-caption text-[#121110]/55">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{t("The link is time-limited. Request a new one if it expires.", "链接有时效限制，过期后可以重新请求。")}</span>
                  </div>
                  <button type="button" onClick={() => navigate("/login")} className="flex w-full items-center justify-center gap-3 bg-[#121110] py-3.5 text-caption font-medium uppercase tracking-widest text-white transition-colors hover:bg-black">
                    {t("Back to sign in", "返回登录")}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-7">
                  <div className="mb-10">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center border border-[#121110]/15 bg-[#f1efe9]">
                      <Mail className="h-5 w-5" />
                    </div>
                    <p className="mb-3 text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/45">{t("Secure access", "安全访问")}</p>
                    <h2 className="font-serif text-4xl font-medium leading-tight">{t("Where should we send it?", "重置链接发送到哪里？")}</h2>
                    <p className="mt-4 text-sm leading-7 text-[#121110]/55">{t("Enter the email on your Helstare account.", "输入你的 Helstare 账户邮箱。")}</p>
                  </div>

                  {error && (
                    <div role="alert" className="border-l-2 border-red-600 bg-red-50 px-4 py-3 text-caption leading-6 text-red-700">
                      {error}
                    </div>
                  )}

                  <label className="block space-y-2">
                    <span className="flex items-center justify-between text-overline font-mono uppercase tracking-widest text-[#121110]/60">
                      {t("Email address", "邮箱地址")}
                      <span className="text-red-700">*</span>
                    </span>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      placeholder="name@example.com"
                      className="w-full border-b border-[#121110]/20 bg-transparent px-0 py-3 text-base outline-none transition-colors placeholder:text-[#121110]/25 focus:border-[#121110]"
                    />
                  </label>

                  {turnstileEnabled && turnstileSiteKey && (
                    <div className="min-h-[65px]" ref={turnstileRef} />
                  )}

                  <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-3 bg-[#121110] py-3.5 text-caption font-medium uppercase tracking-widest text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? <Loader2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    {loading ? t("Sending...", "发送中...") : t("Send reset link", "发送重置链接")}
                  </button>
                  <p className="text-center text-micro leading-5 text-[#121110]/45">{t("We never reveal whether an email is registered.", "我们不会透露邮箱是否已注册。")}</p>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
