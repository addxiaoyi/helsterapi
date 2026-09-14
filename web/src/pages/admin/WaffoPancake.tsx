import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable, Column } from "../../components/ui/DataTable";
import { ApiError, api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { SelectMenu } from "../../components/ui/SelectMenu";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";

type Tab = "catalog" | "pair" | "config" | "subscription";

interface CatalogProduct {
  id: string;
  name: string;
  price?: number | string;
  currency?: string;
  status?: string;
}

interface SubscriptionProductOption {
  id: string;
  product_id?: string | number;
  name?: string;
  duration_value?: number | string;
  duration_unit?: string;
  price?: number | string;
}

const TABS: { key: Tab; labelZh: string; labelEn: string }[] = [
  { key: "catalog", labelZh: "商品目录", labelEn: "Catalog" },
  { key: "pair", labelZh: "关联订阅计划", labelEn: "Pair with Plan" },
  { key: "config", labelZh: "配置", labelEn: "Configuration" },
  { key: "subscription", labelZh: "订阅商品", labelEn: "Subscription Products" },
];

const ENV_OPTIONS = [
  { value: "test", label: "Test" },
  { value: "prod", label: "Production" },
];

const DURATION_UNITS = ["day", "week", "month", "year"] as const;

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function Banner({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`mb-6 px-4 py-3 text-[12px] font-mono uppercase tracking-widest border ${
        type === "success"
          ? "border-[#121110] bg-inverse text-[#FAFAFA]"
          : "border-red-600 bg-transparent text-red-600"
      }`}
    >
      {message}
    </div>
  );
}

export default function WaffoPancake() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();

  // Shared state
  const [activeTab, setActiveTab] = useState<Tab>("catalog");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Catalog
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);

  // Pair
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [pairForm, setPairForm] = useState({
    plan_id: "",
    product_id: "",
    env: "test",
    webhook_url: "",
  });
  const [pairWorking, setPairWorking] = useState(false);

  // Config
  const [configForm, setConfigForm] = useState({
    env: "test",
    api_key: "",
    secret_key: "",
    callback_url: "",
  });
  const [configWorking, setConfigWorking] = useState(false);

  // Subscription Products
  const [subscriptionProducts, setSubscriptionProducts] = useState<SubscriptionProductOption[]>([]);
  const [subForm, setSubForm] = useState({
    product_id: "",
    name: "",
    duration_value: "",
    duration_unit: "month" as typeof DURATION_UNITS[number],
    price: "",
  });
  const [subWorking, setSubWorking] = useState(false);

  const showBanner = useCallback((message: string, type: "success" | "error") => {
    setBanner({ message, type });
    setTimeout(() => setBanner(null), 4000);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Load catalog
  const loadCatalog = useCallback(async () => {
    setLoading(true);
    clearError();
    try {
      const data = (await api.waffoPancakeCatalog()) as unknown[];
      const list = Array.isArray(data) ? data : [];
      setCatalogProducts(
        list.map((item, idx) => {
          const record = item as Record<string, unknown>;
          return {
            id: String(record.id ?? idx),
            name: String(record.name ?? ""),
            price: record.price as number | string | undefined,
            currency: String(record.currency ?? "USD"),
            status: String(record.status ?? "active"),
          };
        }),
      );
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load catalog.", "无法加载商品目录。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [t, clearError, toast]);

  // Load subscription plans for Pair tab
  const loadPlans = useCallback(async () => {
    try {
      const data = (await api.subscriptionPlans()) as Array<{ plan: Record<string, unknown> }>;
      const list = Array.isArray(data)
        ? data.map((item) => item.plan ?? item)
        : [];
      setPlans(list);
    } catch {
      // non-critical
    }
  }, []);

  // Load subscription product options
  const loadSubProducts = useCallback(async () => {
    setLoading(true);
    clearError();
    try {
      const data = (await api.waffoPancakeSubscriptionProductOptions()) as unknown[];
      const list = Array.isArray(data) ? data : [];
      setSubscriptionProducts(
        list.map((item, idx) => {
          const record = item as Record<string, unknown>;
          return {
            id: String(record.id ?? record.product_id ?? idx),
            product_id: record.product_id as string | number | undefined,
            name: record.name as string | undefined,
            duration_value: record.duration_value as number | string | undefined,
            duration_unit: record.duration_unit as string | undefined,
            price: record.price as number | string | undefined,
          };
        }),
      );
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load subscription products.", "无法加载订阅商品。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [t, clearError, toast]);

  // Pre-fill pair form from catalog
  const useProduct = useCallback(
    (product: CatalogProduct) => {
      setPairForm((f) => ({ ...f, product_id: String(product.id) }));
      setActiveTab("pair");
    },
    [],
  );

  // Submit pair form
  const submitPair = async (event: React.FormEvent) => {
    event.preventDefault();
    setPairWorking(true);
    clearError();
    setBanner(null);
    try {
      await api.waffoPancakePair({
        plan_id: readNumber(pairForm.plan_id),
        product_id: pairForm.product_id,
        env: pairForm.env,
        webhook_url: pairForm.webhook_url,
      });
      showBanner(t("Product paired successfully.", "商品关联成功。"), "success");
      toast.success({ message: t("Product paired", "商品已关联") });
      setPairForm({ plan_id: "", product_id: "", env: "test", webhook_url: "" });
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : t("Failed to pair product.", "商品关联失败。");
      showBanner(message, "error");
      toast.error({ message });
    } finally {
      setPairWorking(false);
    }
  };

  // Submit config form
  const submitConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    setConfigWorking(true);
    clearError();
    setBanner(null);
    try {
      await api.waffoPancakeSave({
        env: configForm.env,
        api_key: configForm.api_key,
        secret_key: configForm.secret_key,
        callback_url: configForm.callback_url,
      });
      showBanner(t("Configuration saved.", "配置已保存。"), "success");
      toast.success({ message: t("Configuration saved", "配置已保存") });
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : t("Failed to save config.", "配置保存失败。");
      showBanner(message, "error");
      toast.error({ message });
    } finally {
      setConfigWorking(false);
    }
  };

  // Submit subscription product form
  const submitSubProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubWorking(true);
    clearError();
    setBanner(null);
    try {
      await api.waffoPancakeSubscriptionProduct({
        product_id: subForm.product_id,
        name: subForm.name,
        duration_value: readNumber(subForm.duration_value, 1),
        duration_unit: subForm.duration_unit,
        price: readNumber(subForm.price),
      });
      showBanner(
        t("Subscription product created.", "订阅商品创建成功。"),
        "success",
      );
      toast.success({ message: t("Subscription product created", "订阅商品已创建") });
      setSubForm({ product_id: "", name: "", duration_value: "", duration_unit: "month", price: "" });
      await loadSubProducts();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Failed to create subscription product.", "订阅商品创建失败。");
      showBanner(message, "error");
      toast.error({ message });
    } finally {
      setSubWorking(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    void loadCatalog();
    void loadPlans();
  }, [loadCatalog, loadPlans]);

  useEffect(() => {
    if (activeTab === "subscription") {
      void loadSubProducts();
    }
  }, [activeTab, loadSubProducts]);

  // Catalog columns
  const catalogColumns: Column<CatalogProduct>[] = [
    {
      key: "id",
      title: t("ID", "编号"),
      render: (p) => (
        <span className="font-mono text-caption text-muted">{String(p.id)}</span>
      ),
    },
    {
      key: "name",
      title: t("Name", "名称"),
    },
    {
      key: "price",
      title: t("Price", "价格"),
      render: (p) => (
        <span className="font-mono text-[12px]">
          {p.price != null ? `${p.currency ?? "USD"} ${readNumber(p.price, 0)}` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      title: t("Status", "状态"),
      render: (p) => (
        <span className="inline-flex items-center px-2 py-0.5 text-overline font-mono uppercase tracking-widest border border-[#121110]/10 text-muted">
          {p.status ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (p) => (
        <button
          type="button"
          onClick={() => useProduct(p)}
          className="border border-[#121110] bg-inverse px-3 py-1 text-overline font-mono uppercase tracking-widest text-[#FAFAFA] hover:opacity-80 transition-opacity"
        >
          {t("Use this product", "使用此商品")}
        </button>
      ),
    },
  ];

  // Subscription product columns
  const subColumns: Column<SubscriptionProductOption>[] = [
    {
      key: "id",
      title: t("ID", "编号"),
      render: (p) => (
        <span className="font-mono text-caption text-muted">
          {p.id != null ? String(p.id) : "—"}
        </span>
      ),
    },
    {
      key: "product_id",
      title: t("Product ID", "商品 ID"),
      render: (p) => (
        <span className="font-mono text-caption">
          {p.product_id != null ? String(p.product_id) : "—"}
        </span>
      ),
    },
    {
      key: "name",
      title: t("Name", "名称"),
      render: (p) => <span>{p.name ?? "—"}</span>,
    },
    {
      key: "duration",
      title: t("Duration", "周期"),
      render: (p) => (
        <span className="text-[12px] text-muted">
          {p.duration_value != null
            ? `${readNumber(p.duration_value, 0)} ${p.duration_unit ?? "month"}`
            : "—"}
        </span>
      ),
    },
    {
      key: "price",
      title: t("Price", "价格"),
      render: (p) => (
        <span className="font-mono text-[12px]">
          {p.price != null ? readNumber(p.price, 0).toFixed(2) : "—"}
        </span>
      ),
    },
  ];

  const tabLabel = (item: (typeof TABS)[number]) =>
    t(item.labelEn, item.labelZh);

  return (
    <PageContainer
      title={t("Waffo-Pancake Integration", "Waffo-Pancake 集成")}
      isLoading={loading}
      error={error}
      onRetry={() => {
        clearError();
        void loadCatalog();
      }}
      actions={
        <button
          type="button"
          onClick={() => {
            clearError();
            void loadCatalog();
          }}
          disabled={loading}
          className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("Refresh", "刷新")}
        </button>
      }
    >
      {/* Tab navigation */}
      <div className="mb-8 flex flex-wrap gap-0 border-b border-[#121110]/10">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-micro font-mono uppercase tracking-widest transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-[#121110] text-[#121110]"
                : "text-muted hover:text-[#121110]"
            }`}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      {/* Banner */}
      {banner && <Banner message={banner.message} type={banner.type} />}

      {/* Catalog Tab */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void loadCatalog()}
              disabled={loading}
              className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("Refresh", "刷新")}
            </button>
          </div>
          <DataTable
            columns={catalogColumns}
            data={catalogProducts}
            total={catalogProducts.length}
            page={1}
            pageSize={Math.max(catalogProducts.length, 10)}
            onPageChange={() => {}}
          />
        </div>
      )}

      {/* Pair Tab */}
      {activeTab === "pair" && (
        <div className="max-w-xl">
          <div className="border border-[#121110]/10 bg-white p-8">
            <h2 className="mb-6 font-serif text-2xl">
              {t("Pair Product with Plan", "关联商品与计划")}
            </h2>
            <form onSubmit={(e) => void submitPair(e)} className="space-y-5">
              <label className="block space-y-1 text-overline font-mono uppercase">
                <span>{t("Plan", "订阅计划")}</span>
                <SelectMenu value={pairForm.plan_id} onChange={(value) => setPairForm((f) => ({ ...f, plan_id: value }))} options={[{ value: "", label: t("Select a plan...", "选择订阅计划...") }, ...plans.map((plan) => { const id = readNumber(plan.id); return { value: String(id), label: String(plan.title ?? plan.name ?? `#${id}`) }; })]} />
              </label>

              <label className="block space-y-1 text-overline font-mono uppercase">
                <span>{t("Product ID", "商品 ID")}</span>
                <input
                  type="text"
                  required
                  value={pairForm.product_id}
                  onChange={(e) => setPairForm((f) => ({ ...f, product_id: e.target.value }))}
                  placeholder={t("e.g. prod_xxx", "例如 prod_xxx")}
                  className="mt-1 block w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-[#121110]/30"
                />
              </label>

              <label className="block space-y-1 text-overline font-mono uppercase">
                <span>{t("Environment", "环境")}</span>
                <SelectMenu value={pairForm.env} onChange={(value) => setPairForm((f) => ({ ...f, env: value }))} options={ENV_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))} />
              </label>

              <label className="block space-y-1 text-overline font-mono uppercase">
                <span>{t("Webhook URL", "Webhook 地址")}</span>
                <input
                  type="url"
                  value={pairForm.webhook_url}
                  onChange={(e) =>
                    setPairForm((f) => ({ ...f, webhook_url: e.target.value }))
                  }
                  placeholder={t("https://...", "https://...")}
                  className="mt-1 block w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-[#121110]/30"
                />
              </label>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={pairWorking}
                  className="bg-inverse px-6 py-2 text-overline font-mono uppercase tracking-widest text-[#FAFAFA] disabled:opacity-50"
                >
                  {pairWorking ? t("Saving...", "保存中...") : t("Save", "保存")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config Tab */}
      {activeTab === "config" && (
        <div className="max-w-xl">
          <div className="border border-[#121110]/10 bg-white p-8">
            <h2 className="mb-6 font-serif text-2xl">
              {t("Configuration", "配置")}
            </h2>
            <form onSubmit={(e) => void submitConfig(e)} className="space-y-5">
              <label className="block space-y-1 text-overline font-mono uppercase">
                <span>{t("Environment", "环境")}</span>
                <SelectMenu value={configForm.env} onChange={(value) => setConfigForm((f) => ({ ...f, env: value }))} options={ENV_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))} />
              </label>

              <label className="block space-y-1 text-overline font-mono uppercase">
                <span>{t("API Key", "API Key")}</span>
                <input
                  type="text"
                  value={configForm.api_key}
                  onChange={(e) =>
                    setConfigForm((f) => ({ ...f, api_key: e.target.value }))
                  }
                  placeholder={t("waffo_api_key_...", "waffo_api_key_...")}
                  className="mt-1 block w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-[#121110]/30"
                />
              </label>

              <label className="block space-y-1 text-overline font-mono uppercase">
                <span>{t("Secret Key", "Secret Key")}</span>
                <input
                  type="password"
                  value={configForm.secret_key}
                  onChange={(e) =>
                    setConfigForm((f) => ({ ...f, secret_key: e.target.value }))
                  }
                  placeholder={t("••••••••", "••••••••")}
                  className="mt-1 block w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-[#121110]/30"
                />
              </label>

              <label className="block space-y-1 text-overline font-mono uppercase">
                <span>{t("Callback URL", "回调地址")}</span>
                <input
                  type="url"
                  value={configForm.callback_url}
                  onChange={(e) =>
                    setConfigForm((f) => ({ ...f, callback_url: e.target.value }))
                  }
                  placeholder={t("https://your-domain.com/api/callback", "https://your-domain.com/api/callback")}
                  className="mt-1 block w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-[#121110]/30"
                />
              </label>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={configWorking}
                  className="bg-inverse px-6 py-2 text-overline font-mono uppercase tracking-widest text-[#FAFAFA] disabled:opacity-50"
                >
                  {configWorking ? t("Saving...", "保存中...") : t("Save", "保存")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Products Tab */}
      {activeTab === "subscription" && (
        <div className="space-y-8">
          <div className="max-w-xl border border-[#121110]/10 bg-white p-8">
            <h2 className="mb-6 font-serif text-2xl">
              {t("Create Subscription Product", "创建订阅商品")}
            </h2>
            <form onSubmit={(e) => void submitSubProduct(e)} className="space-y-5">
              <label className="block space-y-1 text-overline font-mono uppercase">
                <span>{t("Product ID", "商品 ID")}</span>
                <input
                  type="text"
                  required
                  value={subForm.product_id}
                  onChange={(e) =>
                    setSubForm((f) => ({ ...f, product_id: e.target.value }))
                  }
                  placeholder={t("e.g. prod_xxx", "例如 prod_xxx")}
                  className="mt-1 block w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-[#121110]/30"
                />
              </label>

              <label className="block space-y-1 text-overline font-mono uppercase">
                <span>{t("Name", "名称")}</span>
                <input
                  type="text"
                  required
                  value={subForm.name}
                  onChange={(e) => setSubForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t("e.g. Pro Plan", "例如 Pro 套餐")}
                  className="mt-1 block w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-[#121110]/30"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1 text-overline font-mono uppercase">
                  <span>{t("Duration Value", "周期数量")}</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={subForm.duration_value}
                    onChange={(e) =>
                      setSubForm((f) => ({ ...f, duration_value: e.target.value }))
                    }
                    className="mt-1 block w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                  />
                </label>

                <label className="block space-y-1 text-overline font-mono uppercase">
                  <span>{t("Duration Unit", "周期单位")}</span>
                  <SelectMenu value={subForm.duration_unit} onChange={(value) => setSubForm((f) => ({ ...f, duration_unit: value as typeof DURATION_UNITS[number] }))} options={DURATION_UNITS.map((unit) => ({ value: unit, label: unit }))} />
                </label>
              </div>

              <label className="block space-y-1 text-overline font-mono uppercase">
                <span>{t("Price", "价格")}</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={subForm.price}
                  onChange={(e) =>
                    setSubForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder={t("0.00", "0.00")}
                  className="mt-1 block w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </label>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={subWorking}
                  className="bg-inverse px-6 py-2 text-overline font-mono uppercase tracking-widest text-[#FAFAFA] disabled:opacity-50"
                >
                  {subWorking ? t("Creating...", "创建中...") : t("Create", "创建")}
                </button>
              </div>
            </form>
          </div>

          {/* Subscription Products List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl">
                {t("Existing Products", "已有商品")}
              </h3>
              <button
                type="button"
                onClick={() => void loadSubProducts()}
                disabled={loading}
                className="flex items-center gap-2 border border-[#121110]/20 px-4 py-2 text-overline font-mono uppercase disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("Refresh", "刷新")}
              </button>
            </div>
            <DataTable
              columns={subColumns}
              data={subscriptionProducts}
              total={subscriptionProducts.length}
              page={1}
              pageSize={Math.max(subscriptionProducts.length, 10)}
              onPageChange={() => {}}
            />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
