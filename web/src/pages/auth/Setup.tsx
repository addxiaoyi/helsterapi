import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

type SetupState = { status: boolean; root_init: boolean; database_type: string };

export default function Setup() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selfUse, setSelfUse] = useState(false);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.setupState()
      .then(setSetup)
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : "无法读取初始化状态。"))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = username.trim();
    if (account.length < 3) {
      setError(t("Username must be at least 3 characters.", "用户名至少需要 3 个字符。"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("Passwords do not match.", "两次输入的密码不一致。"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.initializeSetup({ username: account, password, confirmPassword, SelfUseModeEnabled: selfUse, DemoSiteEnabled: demo });
      navigate("/login", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "初始化失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer title={t("Initialize system", "初始化系统")} subtitle={t("Create the first administrator account.", "创建首个管理员账户。")} isLoading={loading} error={error}>
      {setup?.status ? (
        <div className="border border-[#121110]/10 bg-white p-8 text-center">
          <p className="text-muted">{t("Setup is already complete.", "系统已经完成初始化。")}</p>
          <button className="mt-6 bg-inverse px-6 py-3 text-caption uppercase tracking-widest text-white" onClick={() => navigate("/login")}>{t("Go to sign in", "前往登录")}</button>
        </div>
      ) : (
        <form onSubmit={submit} className="max-w-xl space-y-6 border border-[#121110]/10 bg-white p-8">
          <label className="block text-micro font-mono uppercase tracking-widest">{t("Administrator username", "管理员用户名")}
            <input required minLength={3} maxLength={12} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full border border-[#121110]/10 px-3 py-3 outline-none" />
          </label>
          <label className="block text-micro font-mono uppercase tracking-widest">{t("Password", "密码")}
            <input required minLength={8} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full border border-[#121110]/10 px-3 py-3 outline-none" />
          </label>
          <label className="block text-micro font-mono uppercase tracking-widest">{t("Confirm password", "确认密码")}
            <input required minLength={8} autoComplete="new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full border border-[#121110]/10 px-3 py-3 outline-none" />
          </label>
          <label className="flex items-center gap-3 text-label"><input type="checkbox" checked={selfUse} onChange={(event) => setSelfUse(event.target.checked)} />{t("Enable self-use mode", "启用自用模式")}</label>
          <label className="flex items-center gap-3 text-label"><input type="checkbox" checked={demo} onChange={(event) => setDemo(event.target.checked)} />{t("Enable demo site mode", "启用演示站模式")}</label>
          <button disabled={saving} className="flex w-full items-center justify-center gap-3 bg-inverse py-3 text-caption uppercase tracking-widest text-white disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t("Complete setup", "完成初始化")}</button>
        </form>
      )}
    </PageContainer>
  );
}
