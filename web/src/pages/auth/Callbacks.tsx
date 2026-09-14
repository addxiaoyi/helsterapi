import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Loader2, X } from "lucide-react";
import { useLang } from "../../lib/LanguageContext";
import { api } from "../../lib/api";
import { useApp } from "../../lib/AppContext";

export function OAuthCallback() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { acceptUser } = useApp();
  useEffect(() => {
    const userId = new URLSearchParams(window.location.search).get("user_id");
    if (!userId || !/^\d+$/.test(userId)) {
      navigate("/login", { replace: true });
      return;
    }
    localStorage.setItem("new-api-user-id", userId);
    void api.self()
      .then((user) => {
        acceptUser(user);
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        localStorage.removeItem("new-api-user-id");
        navigate("/login", { replace: true });
      });
  }, [acceptUser, navigate]);
  return <div className="min-h-screen flex items-center justify-center p-6"><div className="bg-white border border-[#121110]/10 p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-6" /><h2 className="text-lg font-serif">{t("Authenticating", "正在验证身份")}</h2></div></div>;
}

export function PaymentCallback() {
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const paymentState = new URLSearchParams(location.search).get("pay") ?? new URLSearchParams(location.search).get("status");
  const success = paymentState === "success" || paymentState === "succeeded";
  const pending = paymentState === "pending" || paymentState === "processing";
  const title = success ? t("Transaction Complete", "交易完成") : pending ? t("Transaction Pending", "交易处理中") : t("Transaction Failed", "交易失败");
  const message = success ? t("Your wallet balance has been updated.", "您的钱包余额已更新。") : pending ? t("The payment is still being confirmed.", "支付仍在确认中。") : t("The payment was declined or cancelled.", "支付被拒绝或取消。");
  return <div className="min-h-screen bg-primary flex items-center justify-center p-6"><div className="bg-white border border-[#121110]/10 p-10 text-center max-w-sm w-full"><div className={`w-12 h-12 border mx-auto flex items-center justify-center mb-6 ${success ? "border-[#121110]" : pending ? "border-amber-500 text-amber-600" : "border-red-500 text-red-500"}`}>{success ? <Check /> : <X />}</div><h2 className="text-xl font-serif mb-2">{title}</h2><p className="text-[12px] text-muted mb-8">{message}</p><button onClick={() => navigate("/wallet")} className="w-full bg-inverse text-white py-3 text-micro font-mono uppercase tracking-[0.2em]">{t("Return to Wallet", "返回钱包")}</button></div></div>;
}
