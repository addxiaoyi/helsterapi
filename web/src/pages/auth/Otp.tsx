import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/ui/PageContainer";
import { ApiError, api } from "../../lib/api";
import { useApp } from "../../lib/AppContext";
import { useLang } from "../../lib/LanguageContext";

export default function Otp() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { acceptUser } = useApp();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = code.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    try {
      const loginUser = await api.verifyTwoFactorLogin(value);
      localStorage.setItem("new-api-user-id", String(loginUser.id));
      const user = await api.self();
      acceptUser(user);
      navigate("/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Verification failed.", "验证码验证失败。"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer title={t("Two-factor verification", "两步验证")} subtitle={t("Enter the code from your authenticator app or a backup code.", "请输入身份验证器验证码或备用码。")}>
      <form onSubmit={verify} className="max-w-md space-y-6 border border-[#121110]/10 bg-white p-8">
        {error && <div className="border-l-2 border-red-600 bg-red-50/50 p-3 text-[12px] text-red-600">{error}</div>}
        <label className="block space-y-2 text-overline font-mono uppercase tracking-widest">
          <span>{t("Verification code", "验证码")}</span>
          <input required autoFocus value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" className="w-full border border-[#121110]/10 px-3 py-3 text-sm outline-none focus:border-[#121110]" />
        </label>
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-3 bg-inverse py-3.5 text-caption uppercase tracking-widest text-white disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>{t("Verify", "验证")}</span><ArrowRight className="h-4 w-4" /></>}
        </button>
        <button type="button" onClick={() => navigate("/login", { replace: true })} className="w-full border border-[#121110]/15 py-3 text-caption uppercase tracking-widest text-[#121110]">
          {t("Back to sign in", "返回登录")}
        </button>
      </form>
    </PageContainer>
  );
}
