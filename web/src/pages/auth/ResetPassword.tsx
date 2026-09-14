import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

export default function ResetPassword() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(email && token ? null : t("This reset link is invalid.", "此重置链接无效。"));
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const generatedPassword = await api.resetPassword(email, token);
      setNewPassword(generatedPassword);
      setDone(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Unable to reset password.", "无法重置密码。"));
    } finally {
      setLoading(false);
    }
  }

  async function copyPassword() {
    if (!newPassword || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (cause) {
      console.error("Unable to copy reset password", cause);
      setError(t("Unable to copy the new password.", "无法复制新密码。"));
    }
  }

  return <PageContainer title={t("Set new password", "设置新密码")} subtitle={t("Complete the password reset from your email link.", "使用邮件中的链接完成密码重置。")}>
    <div className="max-w-md border border-[#121110]/10 bg-white p-8">
      {done ? (
        <div className="space-y-5">
          <p className="text-label text-muted">
            {t(
              "Your password has been reset. Use the generated password below to sign in.",
              "密码已重置，请使用下方生成的新密码登录。",
            )}
          </p>
          {error && (
            <div className="border-l-2 border-red-600 bg-red-50/50 p-3 text-[12px] text-red-600">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              aria-label={t("New password", "新密码")}
              value={newPassword}
              readOnly
              className="min-w-0 flex-1 border border-[#121110]/10 bg-transparent px-3 py-3 font-mono text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => void copyPassword()}
              disabled={!newPassword || !navigator.clipboard}
              aria-label={t("Copy new password", "复制新密码")}
              title={t("Copy new password", "复制新密码")}
              className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#121110]/20 disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full bg-inverse py-3 text-caption uppercase tracking-widest text-white"
          >
            {t("Go to sign in", "前往登录")}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          {error && (
            <div className="border-l-2 border-red-600 bg-red-50/50 p-3 text-[12px] text-red-600">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !email || !token}
            className="w-full bg-inverse py-3 text-caption uppercase tracking-widest text-white disabled:opacity-60"
          >
            {loading ? t("Resetting...", "重置中...") : t("Reset password", "重置密码")}
          </button>
        </form>
      )}
    </div>
  </PageContainer>;
}
