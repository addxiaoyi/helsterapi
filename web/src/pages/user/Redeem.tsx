import React, { useCallback, useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { useToast } from "../../components/ui/Toast";
import { useApp } from "../../lib/AppContext";
import { useLang } from "../../lib/LanguageContext";
import { ApiError, api, type Page } from "../../lib/api";
import {
  ScanFace,
  ChevronRight,
  Gift,
  CheckCircle,
  XCircle,
  Tag,
  Clock,
  Loader2,
} from "lucide-react";

type RedeemRecord = {
  id?: number | string;
  code?: string | null;
  quota?: number | string | null;
  status?: string | null;
  create_time?: number | string | null;
};

type Transaction = {
  id: string;
  code: string;
  quota: string;
  status: string;
  date: string;
};

function numericValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(timestamp: unknown) {
  const seconds = numericValue(timestamp);
  return seconds > 0 ? new Date(seconds * 1000).toLocaleString() : "-";
}

function formatQuota(value: unknown) {
  return numericValue(value).toLocaleString();
}

export default function Redeem() {
  const { t, lang } = useLang();
  const { user, refreshUser } = useApp();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [records, setRecords] = useState<RedeemRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    setError(null);
    try {
      const res = await api.get<Page<RedeemRecord>>(`/user/topup/self?p=${recordsPage}`);
      setRecords(res.items);
      setRecordsTotal(res.total);
    } catch (cause) {
      setRecords([]);
      setRecordsTotal(0);
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load redemption history.", "无法加载兑换记录。");
      setError(message);
      toast.error({ message });
    } finally {
      setRecordsLoading(false);
    }
  }, [recordsPage, t, toast]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  async function handleRedeem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError(t("Please enter a redeem code.", "请输入兑换码。"));
      return;
    }
    if (trimmed.length < 4) {
      setError(t("Redeem code is too short.", "兑换码长度不足。"));
      return;
    }
    setRedeeming(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // POST /user/topup with the code as body (form-encoded)
      await api.redeemTopup(trimmed);
      const updatedUser = await refreshUser();
      const quota = numericValue(updatedUser?.quota);
      const usedQuota = numericValue(updatedUser?.used_quota);
      const remaining = Math.max(quota - usedQuota, 0);
      const message =
        lang === "zh"
          ? `兑换成功！您的余额已更新，当前可用额度为 ${remaining.toLocaleString()}。`
          : `Redemption successful! Your new balance is ${remaining.toLocaleString()} credits.`;
      setSuccessMsg(message);
      toast.success({ message });
      setCode("");
      await loadRecords();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Redemption failed. Please check your code and try again.", "兑换失败，请检查兑换码后重试。");
      setError(message);
      toast.error({ message });
    } finally {
      setRedeeming(false);
    }
  }

  const transactions: Transaction[] = records.map((r) => ({
    id: String(r.id ?? "-"),
    code: r.code ?? "-",
    quota: `+${formatQuota(r.quota)}`,
    status: r.status ?? "unknown",
    date: formatDate(r.create_time),
  }));

  const columns = [
    {
      key: "code",
      title: t("Redeem Code", "兑换码"),
      render: (r: Transaction) => (
        <span className="font-mono text-[12px] tracking-widest text-[#121110]">
          {r.code}
        </span>
      ),
    },
    {
      key: "quota",
      title: t("Quota Added", "增加额度"),
      render: (r: Transaction) => (
        <span className="font-mono text-label font-medium text-[#121110]">
          {r.quota}
        </span>
      ),
    },
    {
      key: "status",
      title: t("Status", "状态"),
      render: (r: Transaction) => {
        const isOk = r.status === "Completed" || r.status === "completed" || r.status === "success";
        return (
          <span className={`inline-flex items-center gap-1.5 text-overline font-mono uppercase tracking-widest px-2 py-0.5 ${
            isOk
              ? "bg-inverse/5 text-[#121110]"
              : "bg-red-50 text-red-700"
          }`}>
            {isOk
              ? <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
              : <XCircle className="w-3 h-3" strokeWidth={1.5} />}
            {t(r.status, r.status === "Completed" ? "已完成" : r.status)}
          </span>
        );
      },
    },
    {
      key: "date",
      title: t("Date", "日期"),
      render: (r: Transaction) => (
        <span className="font-mono text-caption text-muted">
          {r.date}
        </span>
      ),
    },
  ];

  return (
    <PageContainer
      title={t("Redeem Credits", "兑换额度")}
      subtitle={t(
        "Enter a redemption code to add compute credits to your account.",
        "输入兑换码以将算力额度充值到您的账户。",
      )}
      error={error}
      onRetry={() => { setError(null); }}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-5">
        {/* Left: Balance card + redeem form */}
        <div className="space-y-4">
          {/* Black card replica — matching wallet / quota pages */}
          <div className="relative overflow-hidden bg-inverse p-6 text-[#FAFAFA] aspect-[1.586/1] shadow-[0_16px_40px_rgb(0,0,0,0.15)] group sm:p-7">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http:/* www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.08%22/%3E%3C/svg%3E')] mix-blend-overlay pointer-events-none" />
            <div
              className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 pointer-events-none transform translate-x-[-100%] group-hover:translate-x-[100%]"
              style={{ transition: "all 2s ease" }}
            />
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-overline font-mono uppercase tracking-[0.3em] text-[#FAFAFA]/50">
                  {t("Available Compute", "可用算力额度")}
                </span>
                <div className="w-8 h-5 border border-white/20 rounded-sm flex items-center justify-center opacity-70">
                  <div className="w-5 h-2 bg-white/20 rounded-sm" />
                </div>
              </div>
              <div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-xl font-serif text-[#FAFAFA]/50 leading-none pb-1">$</span>
                  <h2 className="text-5xl md:text-6xl font-serif tracking-tight leading-none text-[#FAFAFA]">
                    {formatQuota(Math.max((user?.quota ?? 0) - (user?.used_quota ?? 0), 0))}
                  </h2>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-overline font-mono uppercase tracking-[0.2em] text-[#FAFAFA]/40">
                    {(user?.group || t("Default group", "默认分组")).toUpperCase()}
                  </span>
                  <ScanFace className="w-5 h-5 text-[#FAFAFA]/30" strokeWidth={1} />
                </div>
              </div>
            </div>
          </div>

          {/* Redeem form card */}
          <div className="ui-panel space-y-4 border border-[#121110]/5 bg-white p-5 shadow-[0_4px_24px_rgb(0,0,0,0.02)] sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-mono uppercase tracking-[0.1em] text-[#121110]">
                {t("Redeem Code", "输入兑换码")}
              </h3>
              <Tag className="w-4 h-4 text-[#121110]/40" strokeWidth={1.5} />
            </div>

            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-mono text-[#121110]/30 group-focus-within:text-[#121110] transition-colors">
                  •
                </span>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (error) setError(null);
                  }}
                  placeholder={t("Enter code, e.g. HELLO-2024-ABCD", "输入兑换码，如 HELLO-2024-ABCD")}
                  disabled={redeeming}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="w-full border border-[#121110]/10 bg-transparent hover:border-[#121110]/30 focus:border-[#121110] focus:bg-primary transition-all duration-300 py-3 pl-8 pr-3 text-label font-mono tracking-wider text-[#121110] outline-none placeholder:text-[#121110]/25 disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={redeeming || !code.trim()}
                className="w-full bg-inverse text-[#FAFAFA] py-3.5 text-micro font-mono uppercase tracking-[0.2em] hover:bg-black transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {redeeming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                    {t("Redeeming...", "兑换中...")}
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" strokeWidth={1.5} />
                    {t("Redeem Now", "立即兑换")}
                    <ChevronRight className="w-4 h-4 stroke-[1.5] group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Success feedback */}
            {successMsg && (
              <div className="flex items-start gap-3 bg-inverse/5 p-4 border border-[#121110]/10">
                <CheckCircle className="w-5 h-5 text-[#121110] shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-label font-medium text-[#121110] leading-relaxed">
                    {successMsg}
                  </p>
                </div>
              </div>
            )}

            {/* Error feedback */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 p-4 border border-red-100">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                <p className="text-label text-red-700 leading-relaxed">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Redemption history table */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif text-[#121110]">
              {t("Redemption History", "兑换记录")}
            </h3>
            <span className="text-overline font-mono uppercase tracking-widest text-muted">
              {t("Total", "共")} {recordsTotal} {t("records", "条记录")}
            </span>
          </div>
          <div className="flex-1">
            <DataTable
              columns={columns}
              data={transactions}
              total={recordsTotal}
              page={recordsPage}
              pageSize={8}
              onPageChange={setRecordsPage}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
