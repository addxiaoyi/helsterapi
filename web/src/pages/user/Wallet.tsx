import { useLang } from "../../lib/LanguageContext";
import { useApp } from "../../lib/AppContext";
import { api, type Page } from "../../lib/api";
import React, { useCallback, useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { openPaymentComplianceGate } from "../../components/layout/PaymentComplianceGate";
import { ScanFace, ChevronRight, Loader2, X } from "lucide-react";
import { SelectMenu } from "../../components/ui/SelectMenu";
import { downloadCsv } from "../../lib/io";

type TopUp = {
  id: number;
  amount: number;
  money: number;
  trade_no: string;
  payment_method: string;
  create_time: number;
  status: string;
};

type Transaction = {
  id: string;
  date: string;
  type: string;
  method: string;
  amount: string;
  status: string;
};

type CreemProduct = {
  productId: string;
  name?: string;
  price?: number;
  currency?: string;
};

type EmbeddedPayment = { url: string; fields: Record<string, string> };
const EPAY_FRAME_NAME = "helstare-epay-frame";

function readNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function readText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeTopup(value: Record<string, unknown>): TopUp {
  return {
    id: readNumber(value.id),
    amount: readNumber(value.amount),
    money: readNumber(value.money),
    trade_no: readText(value.trade_no),
    payment_method: readText(value.payment_method),
    create_time: readNumber(value.create_time),
    status: readText(value.status),
  };
}

function formatDate(timestamp: unknown) {
  const numericTimestamp = readNumber(timestamp, 0);
  if (numericTimestamp <= 0) return "-";
  const date = new Date(numericTimestamp * 1000);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function formatQuota(value: number, quotaPerUnit?: number) {
  const displayValue =
    quotaPerUnit && quotaPerUnit > 0 ? value / quotaPerUnit : value;
  return displayValue.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default function Wallet() {
  const { t } = useLang();
  const { user } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [amount, setAmount] = useState("");
  const [topups, setTopups] = useState<TopUp[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [amountOptions, setAmountOptions] = useState<number[]>([]);
  const [payMethods, setPayMethods] = useState<
    Array<{ type: string; name?: string; min_topup?: string | number }>
  >([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [creemProducts, setCreemProducts] = useState<CreemProduct[]>([]);
  const [selectedCreemProduct, setSelectedCreemProduct] = useState("");
  const [waffoPayMethods, setWaffoPayMethods] = useState<
    Array<{ name?: string; payMethodType?: string; payMethodName?: string }>
  >([]);
  const [selectedWaffoPayMethod, setSelectedWaffoPayMethod] = useState(0);
  const [isPaying, setIsPaying] = useState(false);
  const [embeddedPayment, setEmbeddedPayment] = useState<EmbeddedPayment | null>(null);
  const [minTopup, setMinTopup] = useState(0);
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [quotaPerUnit, setQuotaPerUnit] = useState<number>();
  const [affCode, setAffCode] = useState("");
  const [transferQuota, setTransferQuota] = useState("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!embeddedPayment) return;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = embeddedPayment.url;
    form.target = EPAY_FRAME_NAME;
    form.style.display = "none";
    for (const [name, value] of Object.entries(embeddedPayment.fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
    form.remove();
  }, [embeddedPayment]);
  const loadTopups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.topupRecords(page);
      const items = Array.isArray(response.items)
        ? response.items
            .filter(
              (item): item is Record<string, unknown> =>
                typeof item === "object" && item !== null,
            )
            .map(normalizeTopup)
        : [];
      setTopups(items);
      setTotal(readNumber(response.total));
    } catch (cause) {
      setTopups([]);
      setTotal(0);
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load top-up history.", "无法加载充值记录。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsLoading(false);
    }
  }, [page, t, toast]);

  useEffect(() => {
    void loadTopups();
  }, [loadTopups]);

  const loadPaymentInfo = useCallback(async () => {
    try {
      const info = await api.topupInfo();
      if (info.payment_compliance_confirmed === false)
        openPaymentComplianceGate();
      const methods = info.pay_methods ?? [];
      let products: CreemProduct[] = [];
      if (info.creem_products) {
        try {
          const parsed: unknown = JSON.parse(info.creem_products);
          if (Array.isArray(parsed)) {
            products = parsed.filter(
              (item): item is CreemProduct =>
                typeof item === "object" &&
                item !== null &&
                typeof (item as { productId?: unknown }).productId === "string",
            );
          }
        } catch (cause) {
          console.error("Unable to parse Creem products", cause);
        }
      }
      setAmountOptions(info.amount_options ?? []);
      setPayMethods(methods);
      setSelectedMethod(methods[0]?.type ?? "");
      setCreemProducts(products);
      setSelectedCreemProduct(products[0]?.productId ?? "");
      const waffoMethods = info.waffo_pay_methods ?? [];
      setWaffoPayMethods(waffoMethods);
      setSelectedWaffoPayMethod(0);
      setMinTopup(info.min_topup ?? 0);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load payment options.", "无法加载支付选项。");
      setError(message);
      toast.error({ message });
    }
  }, [t, toast]);

  useEffect(() => {
    void loadPaymentInfo();
    const refresh = () => void loadPaymentInfo();
    window.addEventListener("zzznew:payment-compliance-confirmed", refresh);
    return () =>
      window.removeEventListener(
        "zzznew:payment-compliance-confirmed",
        refresh,
      );
  }, [loadPaymentInfo]);

  useEffect(() => {
    void api
      .status()
      .then((status) => {
        const isCurrency = status.quota_display_type === "currency";
        setCurrencySymbol(
          isCurrency ? status.custom_currency_symbol?.trim() || "$" : "",
        );
        setQuotaPerUnit(
          isCurrency &&
            Number.isFinite(status.quota_per_unit) &&
            (status.quota_per_unit ?? 0) > 0
            ? status.quota_per_unit
            : undefined,
        );
      })
      .catch((cause) => {
        setCurrencySymbol("");
        setQuotaPerUnit(undefined);
        console.error("Unable to load quota display settings", cause);
      });
  }, []);

  useEffect(() => {
    void api
      .affCode()
      .then(setAffCode)
      .catch((cause) => {
        const message =
          cause instanceof Error
            ? cause.message
            : t("Unable to load referral code.", "无法加载推广码。");
        setError(message);
        toast.error({ message });
      });
  }, [t, toast]);

  async function transferQuotaToBalance(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const quota = Number(transferQuota);
    if (!Number.isInteger(quota) || quota <= 0) {
      setError(
        t("Enter a positive integer quota.", "请输入大于 0 的整数额度。"),
      );
      return;
    }
    setTransferring(true);
    setError(null);
    try {
      await api.transferAffQuota(quota);
      setTransferQuota("");
      toast.success({ message: t("Quota transferred.", "额度已转入。") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to transfer quota.", "额度转入失败。");
      setError(message);
      toast.error({ message });
    } finally {
      setTransferring(false);
    }
  }

  async function processPayment() {
    const method = selectedMethod;
    const loweredMethod = method.toLowerCase();
    const selectedProduct = creemProducts.find(
      (product) => product.productId === selectedCreemProduct,
    );
    const value =
      loweredMethod === "creem"
        ? Number(selectedProduct?.price)
        : Number(amount);
    if (loweredMethod === "creem" && !selectedProduct) {
      setError(t("Select a Creem product.", "请选择 Creem 产品。"));
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError(t("Enter a valid amount.", "请输入有效金额。"));
      return;
    }
    const methodMinimum = Number(
      payMethods.find((item) => item.type === method)?.min_topup,
    );
    const minimum =
      Number.isFinite(methodMinimum) && methodMinimum > 0
        ? methodMinimum
        : minTopup;
    if (minimum > 0 && value < minimum) {
      setError(
        t(`Minimum top-up is ${minimum}.`, `最低充值额度为 ${minimum}。`),
      );
      return;
    }
    if (!method) {
      setError(t("No payment method is enabled.", "当前未启用支付方式。"));
      return;
    }
    const embedsPayment = !["stripe", "creem", "waffo", "waffo-pancake", "waffo_pancake"].includes(loweredMethod);
    const confirmed = await confirm({
      title: t("Confirm payment", "确认支付"),
      description: t(
        embedsPayment
          ? `Top up ${value} via ${method}? The payment page will open here.`
          : `Top up ${value} via ${method}? You will be redirected to the payment provider.`,
        embedsPayment
          ? `将通过 ${method} 充值 ${value}。支付页面将在当前弹窗中打开。`
          : `将通过 ${method} 充值 ${value}。确认后将跳转至支付页面。`,
      ),
      confirmText: t("Continue to payment", "继续支付"),
      variant: "default",
    });
    if (!confirmed) return;
    setIsPaying(true);
    setError(null);
    try {
      const result = await startPayment(method, value);
      if (result.kind === "redirect" && result.url) {
        toast.success({
          message: t("Redirecting to payment...", "正在跳转至支付页面..."),
        });
        if (result.form) {
          setEmbeddedPayment({ url: result.url, fields: result.form });
        } else {
          window.location.assign(result.url);
        }
        return;
      }
      if (result.kind === "code") {
        const message = t(
          `Payment completed offline with code ${result.code}.`,
          `支付以离线方式完成，参考号 ${result.code}。`,
        );
        setError(message);
        toast.info({ message });
      }
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to start payment.", "无法发起支付。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsPaying(false);
    }
  }

  async function startPayment(
    method: string,
    value: number,
  ): Promise<
    { kind: "redirect"; url?: string; form?: Record<string, string> } | { kind: "code"; code?: string }
  > {
    const lowered = method.toLowerCase();
    if (lowered === "stripe") {
      const r = await api.requestStripePayment(value);
      return {
        kind: "redirect",
        url:
          r.url ??
          r.pay_link ??
          (typeof r.data === "object" ? r.data?.pay_link : undefined),
      };
    }
    if (lowered === "creem") {
      if (!selectedCreemProduct) {
        throw new Error(t("Select a Creem product.", "请选择 Creem 产品。"));
      }
      const r = await api.requestCreemPayment(selectedCreemProduct);
      return {
        kind: "redirect",
        url:
          r.url ??
          r.checkout_url ??
          (typeof r.data === "object" ? r.data?.checkout_url : undefined),
      };
    }
    if (lowered === "waffo") {
      const r = await api.requestWaffoPayment(value, selectedWaffoPayMethod);
      return {
        kind: "redirect",
        url:
          r.url ??
          r.payment_url ??
          (typeof r.data === "object" ? r.data?.payment_url : undefined),
      };
    }
    if (lowered === "waffo-pancake" || lowered === "waffo_pancake") {
      const r = await api.requestWaffoPancakePayment(value);
      return {
        kind: "redirect",
        url:
          r.url ??
          r.checkout_url ??
          (typeof r.data === "object" ? r.data?.checkout_url : undefined),
      };
    }
    const r = await api.requestPayment(value, method);
    if (r.message === "error") {
      throw new Error(
        r.data || t("Payment request was rejected.", "支付请求被服务端拒绝。"),
      );
    }
    if (!r.url) {
      throw new Error(
        t(
          "Payment URL was not returned by the server.",
          "服务端未返回支付地址。",
        ),
      );
    }
    return {
      kind: "redirect",
      url: r.url,
      form: typeof r.data === "object" && r.data !== null ? r.data : undefined,
    };
  }

  const transactions: Transaction[] = topups.map((topup) => ({
    id: topup.trade_no || String(topup.id),
    date: formatDate(topup.create_time),
    type: "Top Up" as const,
    method: topup.payment_method || "-",
    amount: topup.money.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    status: topup.status || "-",
  }));
  const columns = [
    {
      key: "id",
      title: t("Transaction ID", "交易 ID"),
      render: (r: Transaction) => (
        <span className="font-mono text-caption text-[#121110]/40">{r.id}</span>
      ),
    },
    {
      key: "date",
      title: t("Date", "日期"),
      render: (r: Transaction) => (
        <span className="font-mono text-caption text-[#121110]/80">
          {r.date}
        </span>
      ),
    },
    {
      key: "type",
      title: t("Type", "类型"),
      render: (r: Transaction) => (
        <span className="text-[12px]">
          {t(r.type, r.type === "Usage Deduction" ? "使用抵扣" : "余额充值")}
        </span>
      ),
    },
    {
      key: "method",
      title: t("Method", "方式"),
      render: (r: Transaction) => (
        <span className="text-[12px]">{r.method}</span>
      ),
    },
    {
      key: "amount",
      title: t("Amount", "金额"),
      render: (r: Transaction) => (
        <span
          className={`font-mono text-label ${r.amount.startsWith("+") ? "text-[#121110]" : "text-[#121110]/40"}`}
        >
          {r.amount}
        </span>
      ),
    },
    {
      key: "status",
      title: t("Status", "状态"),
      render: (r: Transaction) => (
        <span className="text-overline font-mono uppercase tracking-widest text-[#121110] bg-inverse/5 px-2 py-0.5">
          {t(r.status, r.status === "Completed" ? "已完成" : r.status)}
        </span>
      ),
    },
  ];
  function exportTopups() {
    downloadCsv(`top-ups-${new Date().toISOString().slice(0, 10)}.csv`, topups, [
      { key: "id", header: t("ID", "编号") },
      { key: "trade_no", header: t("Transaction ID", "交易 ID") },
      { key: "create_time", header: t("Created at", "创建时间"), format: (value) => formatDate(readNumber(value)) },
      { key: "payment_method", header: t("Payment method", "支付方式") },
      { key: "money", header: t("Amount", "金额") },
      { key: "status", header: t("Status", "状态") },
    ]);
    toast.success({ message: t("Top-up history exported.", "充值记录已导出。") });
  }
  return (
    <PageContainer
      title={t("Financial Ledger", "财务账本")}
      subtitle={t(
        "Manage your balances, billing methods, and transaction history.",
        "管理您的余额、计费方式与交易历史。",
      )}
      isLoading={isLoading}
      error={error}
      onRetry={loadTopups}
    >
      {" "}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-5">
        {" "}
        {/* Luxury Balance Card & Controls */}{" "}
        <div className="space-y-4 lg:col-span-2">
          {" "}
          {/* Black Card Replica */}{" "}
          <div className="relative overflow-hidden bg-inverse p-6 text-[#FAFAFA] aspect-[1.586/1] shadow-[0_16px_40px_rgb(0,0,0,0.15)] group sm:p-7">
            {" "}
            {/* Holographic / Noise texture layer */}{" "}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http:/* www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.08%22/%3E%3C/svg%3E')] mix-blend-overlay pointer-events-none" />{" "}
            {/* Subtle gradient that moves on hover. */}{" "}
            <div
              className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none transform translate-x-[-100%] group-hover:translate-x-[100%]"
              style={{ transition: "all 2s ease" }}
            />{" "}
            <div className="relative z-10 h-full flex flex-col justify-between">
              {" "}
              <div className="flex justify-between items-start">
                {" "}
                <span className="text-overline font-mono uppercase tracking-[0.3em] text-[#FAFAFA]/50">
                  {t("Available Compute", "可用算力额度")}
                </span>{" "}
                <div className="w-8 h-5 border border-white/20 rounded-sm flex items-center justify-center opacity-70">
                  {" "}
                  <div className="w-5 h-2 bg-white/20 rounded-sm" />{" "}
                </div>{" "}
              </div>{" "}
              <div>
                {" "}
                <div className="flex items-end gap-2 mb-2">
                  {" "}
                  <span className="text-xl font-serif text-[#FAFAFA]/50 leading-none pb-1">
                    {currencySymbol}
                  </span>{" "}
                  <h2 className="text-5xl md:text-6xl font-serif tracking-tight leading-none text-[#FAFAFA]">
                    {formatQuota(
                      Math.max((user?.quota ?? 0) - (user?.used_quota ?? 0), 0),
                      quotaPerUnit,
                    )}
                  </h2>{" "}
                </div>{" "}
                <div className="flex justify-between items-end">
                  {" "}
                  <span className="text-overline font-mono uppercase tracking-[0.2em] text-[#FAFAFA]/40">
                    {(
                      user?.group || t("Default group", "默认分组")
                    ).toUpperCase()}{" "}
                  </span>{" "}
                  <ScanFace
                    className="w-5 h-5 text-[#FAFAFA]/30"
                    strokeWidth={1}
                  />{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {/* Top Up Controls */}{" "}
          <div className="ui-panel space-y-5 border border-[#121110]/5 bg-white p-5 shadow-[0_4px_24px_rgb(0,0,0,0.02)] sm:p-6">
            {" "}
            <div className="flex justify-between items-center">
              {" "}
              <h3 className="text-[12px] font-mono uppercase tracking-[0.1em] text-[#121110]">
                {t("Select Amount", "选择金额")}
              </h3>{" "}
            </div>{" "}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {" "}
              {amountOptions.map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className={`min-h-11 border py-3 text-label font-mono transition-[background-color,border-color,transform,box-shadow] duration-200 ${amount === val.toString() ? "border-[#121110] bg-inverse text-[#FAFAFA] shadow-md" : "border-[#121110]/10 text-[#121110] bg-transparent hover:border-[#121110]/30 hover:bg-primary"}`}
                >
                  {" "}
                  ${val}{" "}
                </button>
              ))}{" "}
              <div className="relative group">
                {" "}
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-mono text-[#121110]/40 group-focus-within:text-[#121110] transition-colors">
                  $
                </span>{" "}
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-full min-h-11 w-full border border-[#121110]/10 bg-transparent py-3 pl-6 pr-2 text-label font-mono text-[#121110] outline-none transition-all duration-200 hover:border-[#121110]/30 focus:border-[#121110] focus:bg-primary"
                />{" "}
              </div>{" "}
            </div>{" "}
            <SelectMenu value={selectedMethod} onChange={setSelectedMethod} disabled={payMethods.length === 0 || isPaying} options={payMethods.map((method) => ({ value: method.type, label: method.name || method.type }))} />
            {selectedMethod.toLowerCase() === "creem" && (
              <SelectMenu value={selectedCreemProduct} onChange={setSelectedCreemProduct} disabled={creemProducts.length === 0 || isPaying} options={creemProducts.map((product) => ({ value: product.productId, label: `${product.name || product.productId}${product.price !== undefined ? ` - ${product.currency || "USD"} ${product.price}` : ""}` }))} />
            )}
            {selectedMethod.toLowerCase() === "waffo" && (
              <SelectMenu value={String(selectedWaffoPayMethod)} onChange={(value) => setSelectedWaffoPayMethod(Number(value))} disabled={waffoPayMethods.length === 0 || isPaying} options={waffoPayMethods.map((payMethod, index) => ({ value: String(index), label: payMethod.name || payMethod.payMethodName || payMethod.payMethodType || `Method ${index + 1}` }))} />
            )}
            <button
              onClick={() => void processPayment()}
              disabled={
                isPaying ||
                !selectedMethod ||
                (selectedMethod.toLowerCase() !== "creem" &&
                  amountOptions.length === 0) ||
                (selectedMethod.toLowerCase() === "creem" &&
                  !selectedCreemProduct)
              }
              className="w-full bg-inverse text-[#FAFAFA] py-3.5 text-micro font-mono uppercase tracking-[0.2em] hover:bg-black transition-all duration-300 active:scale-[0.98] ease-out-expo flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {" "}
              {isPaying && (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              )}
              {isPaying
                ? t("Processing...", "处理中...")
                : t("Process Payment", "处理支付")}{" "}
              {!isPaying && (
                <ChevronRight className="w-4 h-4 stroke-[1.5] group-hover:translate-x-1 transition-transform" />
              )}{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        <div className="space-y-4 lg:col-span-1">
          <div className="ui-panel border border-[#121110]/10 bg-white p-5">
            <h3 className="mb-3 font-serif text-lg">
              {t("Referral code", "推广码")}
            </h3>
            <p className="mb-4 font-mono text-xl tracking-widest">
              {affCode || "-"}
            </p>
            <p className="text-[12px] text-muted">
              {t(
                "Share this code to receive referral benefits.",
                "分享此推广码以获得推广收益。",
              )}
            </p>
          </div>
          <form
            onSubmit={transferQuotaToBalance}
            className="ui-panel border border-[#121110]/10 bg-white p-5"
          >
            <h3 className="mb-3 font-serif text-lg">
              {t("Transfer referral quota", "转入推广额度")}
            </h3>
            <input
              required
              min="1"
              step="1"
              type="number"
              value={transferQuota}
              onChange={(event) => setTransferQuota(event.target.value)}
              placeholder={t("Quota", "额度")}
              className="mb-4 w-full border-b border-[#121110]/20 bg-transparent p-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={transferring}
              className="flex items-center gap-2 bg-inverse px-4 py-2 text-overline font-mono uppercase text-white disabled:opacity-50"
            >
              {transferring && (
                <Loader2
                  className="w-3.5 h-3.5 animate-spin"
                  strokeWidth={1.5}
                />
              )}
              {transferring
                ? t("Transferring...", "转入中...")
                : t("Transfer", "转入")}
            </button>
          </form>
        </div>{" "}
        {/* History Table */}{" "}
        <div className="flex flex-col lg:col-span-3">
          {" "}
          <div className="mb-3 flex items-center justify-between">
            {" "}
            <h3 className="text-xl font-serif text-[#121110]">
              {t("Transaction History", "交易历史")}
            </h3>{" "}
            <button
              type="button"
              onClick={() => window.print()}
              className="text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/40 hover:text-[#121110] transition-colors border-b border-[#121110]/10 hover:border-[#121110] pb-0.5"
            >
              {" "}
              {t("Download PDF", "下载凭证")}{" "}
            </button>{" "}
            <button type="button" onClick={exportTopups} disabled={topups.length === 0} className="text-overline font-mono uppercase tracking-[0.2em] text-[#121110]/40 hover:text-[#121110] transition-colors border-b border-[#121110]/10 hover:border-[#121110] pb-0.5 disabled:opacity-40">
              {t("Export CSV", "导出 CSV")}
            </button>{" "}
          </div>{" "}
          <div className="flex-1">
            {" "}
            <DataTable
              columns={columns}
              data={transactions}
              total={total}
              page={page}
              pageSize={6}
              onPageChange={setPage}
            />{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {embeddedPayment && (
        <div className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-ink/50 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="embedded-payment-title">
          <div className="flex h-[min(820px,calc(100dvh-1rem))] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-ink/15 bg-paper shadow-floating sm:h-[min(820px,calc(100dvh-2.5rem))]">
            <div className="flex shrink-0 items-center justify-between border-b border-ink/10 px-4 py-3">
              <div>
                <h2 id="embedded-payment-title" className="text-label font-semibold text-ink">{t("Complete payment", "完成支付")}</h2>
                <p className="text-caption text-muted">{t("Complete the payment below, then close this window.", "请在下方完成支付，完成后关闭此窗口。")}</p>
              </div>
              <button type="button" className="icon-btn h-9 w-9 rounded-md border border-ink/15" onClick={() => { setEmbeddedPayment(null); void loadTopups(); }} aria-label={t("Close payment", "关闭支付窗口")}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe name={EPAY_FRAME_NAME} title={t("Payment provider", "支付页面")} className="min-h-0 flex-1 border-0 bg-white" />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
