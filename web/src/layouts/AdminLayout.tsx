import React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  FileCog,
  FlaskConical,
  LayoutDashboard,
  PlugZap,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Settings2,
  Sun,
  UserCircle,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useApp as useAppContext } from "../lib/AppContext";
import { Navigate } from "react-router-dom";
import { useLang } from "../lib/LanguageContext";
import { api } from "../lib/api";
import { DOCK_ICONS } from "../components/ui/DockIcons";
import "../components/ui/DockIconAnimations.css";
import NoticeBanner from "../components/layout/NoticeBanner";
import PaymentComplianceGate from "../components/layout/PaymentComplianceGate";
import NotificationCenter from "../components/layout/NotificationCenter";
import { toggleTheme } from "../components/ThemeRuntime";

const AvailableModelsIcon = DOCK_ICONS["user-models"];

const allNavItems = [
  // Personal / Core
  { id: "dashboard", label: "控制台", icon: DOCK_ICONS.dashboard, path: "/dashboard", adminOnly: false },
  { id: "playground", label: "工作台", icon: FlaskConical, path: "/playground", adminOnly: false },
  { id: "keys", label: "令牌", icon: DOCK_ICONS.keys, path: "/keys", adminOnly: false },
  { id: "logs", label: "日志", icon: DOCK_ICONS.logs, path: "/usage-logs", adminOnly: false },
  { id: "usage", label: "用量分析", icon: DOCK_ICONS.usage, path: "/usage", adminOnly: false },
  { id: "wallet", label: "钱包与额度", icon: DOCK_ICONS.wallet, path: "/wallet", adminOnly: false },
  { id: "subscriptions", label: "订阅", icon: DOCK_ICONS.subscriptions, path: "/subscriptions", adminOnly: false },
  { id: "redeem", label: "兑换码", icon: DOCK_ICONS.redeem, path: "/redeem", adminOnly: false },
  { id: "chat-history", label: "会话记录", icon: DOCK_ICONS["chat-history"], path: "/chat-history", adminOnly: false },
  { id: "task-history", label: "任务历史", icon: DOCK_ICONS["active-tasks"], path: "/task-history", adminOnly: false },
  { id: "profile", label: "个人资料", icon: DOCK_ICONS.profile, path: "/profile", adminOnly: false },
  { id: "settings", label: "设置", icon: DOCK_ICONS.settings, path: "/settings", adminOnly: false },
  // Admin
  { id: "users", label: "用户管理", icon: DOCK_ICONS.users, path: "/users", adminOnly: true },
  { id: "channels", label: "渠道配置", icon: DOCK_ICONS.channels, path: "/channels", adminOnly: true },
  { id: "models", label: "模型管理", icon: DOCK_ICONS.models, path: "/models", adminOnly: true },
  { id: "vendors", label: "供应商", icon: DOCK_ICONS.vendors, path: "/vendors", adminOnly: true },
  { id: "redemption", label: "兑换码", icon: DOCK_ICONS.redemption, path: "/redemption-codes", adminOnly: true },
  { id: "fingerprints", label: "风控指纹", icon: DOCK_ICONS.fingerprints, path: "/fingerprints", adminOnly: true },
  { id: "tasks", label: "活跃任务", icon: DOCK_ICONS.tasks, path: "/active-tasks", adminOnly: true },
  { id: "sys-info", label: "系统信息", icon: DOCK_ICONS["sys-info"], path: "/system-info", adminOnly: true },
  { id: "task-plugins", label: "任务插件", icon: PlugZap, path: "/task-plugins", adminOnly: true },
  { id: "system-settings", label: "系统设置", icon: LayoutDashboard, path: "/system-settings/site", adminOnly: true },
  { id: "system-auth", label: "认证设置", icon: ShieldCheck, path: "/system-settings/auth", adminOnly: true },
  { id: "system-billing", label: "计费设置", icon: DOCK_ICONS.wallet, path: "/system-settings/billing", adminOnly: true },
  { id: "system-content", label: "内容设置", icon: ClipboardList, path: "/system-settings/content", adminOnly: true },
  { id: "system-models", label: "模型设置", icon: SlidersHorizontal, path: "/system-settings/models", adminOnly: true },
  { id: "system-operations", label: "运维设置", icon: FileCog, path: "/system-settings/operations", adminOnly: true },
  { id: "system-security", label: "安全设置", icon: ShieldAlert, path: "/system-settings/security", adminOnly: true },
  { id: "operations", label: "运维中心", icon: DOCK_ICONS.operations, path: "/operations", adminOnly: true },
  { id: "deployments", label: "模型部署", icon: DOCK_ICONS.deployments, path: "/deployments", adminOnly: true },
  { id: "prefill", label: "预填充组", icon: DOCK_ICONS.prefill, path: "/prefill-groups", adminOnly: true },
  { id: "permissions", label: "权限目录", icon: DOCK_ICONS.permissions, path: "/permissions", adminOnly: true },
  { id: "oauth", label: "OAuth 提供商", icon: DOCK_ICONS.oauth, path: "/oauth-providers", adminOnly: true },
  { id: "reports", label: "数据报表", icon: DOCK_ICONS.reports, path: "/data-reports", adminOnly: true },
  { id: "topups", label: "充值订单", icon: DOCK_ICONS.topups, path: "/topups", adminOnly: true },
  { id: "diagnostics", label: "请求诊断", icon: DOCK_ICONS.diagnostics, path: "/diagnostics", adminOnly: true },
  { id: "task-records", label: "任务记录", icon: DOCK_ICONS["task-records"], path: "/task-records", adminOnly: true },
  { id: "midjourney-tasks", label: "Midjourney 任务", icon: DOCK_ICONS["midjourney-tasks"], path: "/midjourney-tasks", adminOnly: true },
  { id: "groups", label: "访问分组", icon: DOCK_ICONS.groups, path: "/groups", adminOnly: true },
  { id: "subscription-plans", label: "订阅计划", icon: DOCK_ICONS["subscription-plans"], path: "/subscription-plans", adminOnly: true },
  { id: "user-subscriptions", label: "用户订阅", icon: DOCK_ICONS["user-subscriptions"], path: "/user-subscriptions", adminOnly: true },
  { id: "channel-affinity", label: "渠道亲和", icon: DOCK_ICONS["channel-affinity"], path: "/channel-affinity", adminOnly: true },
  { id: "ratio-config", label: "模型比例", icon: DOCK_ICONS["ratio-config"], path: "/ratio-config", adminOnly: true },
  { id: "two-factor", label: "两步验证", icon: DOCK_ICONS["two-factor"], path: "/two-factor", adminOnly: true },
  { id: "waffo-pancake", label: "Waffo-Pancake", icon: DOCK_ICONS["waffo-pancake"], path: "/waffo-pancake", adminOnly: true },
];

type NavItem = (typeof allNavItems)[number];

function isNavItemActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function isMostSpecificNavItem(pathname: string, item: NavItem, items: NavItem[]) {
  if (!isNavItemActive(pathname, item.path)) return false;
  return !items.some(
    (candidate) =>
      candidate.id !== item.id &&
      candidate.path.length > item.path.length &&
      isNavItemActive(pathname, candidate.path),
  );
}

function DockSection({
  label,
  items,
  pathname,
  action,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  action?: React.ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <section className="min-w-0 px-2 py-2">
      <nav aria-label={label} className="flex min-w-0 flex-wrap items-center justify-center gap-1">
        {items.map((item) => {
          const isActive = isMostSpecificNavItem(pathname, item, items);
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              layout
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
              className={`flex h-10 shrink-0 items-center overflow-hidden rounded-xl text-caption ${
                isActive
                  ? "bg-ink/90 text-paper shadow-[0_4px_14px_rgba(18,17,16,0.2)]"
                  : "w-10 text-muted hover:bg-white/60 hover:text-ink"
              }`}
            >
              <NavLink
                to={item.path}
                title={item.label}
                className={`flex h-10 items-center justify-center gap-2 ${isActive ? "px-3" : "w-10"}`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.5]" />
                {isActive ? (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    transition={{ duration: 0.18, delay: 0.06 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                ) : <span className="sr-only">{item.label}</span>}
              </NavLink>
            </motion.div>
          );
        })}
        {action && (
          <div className="ml-1 flex h-8 shrink-0 items-center border-l border-ink/10 pl-1">
            {action}
          </div>
        )}
      </nav>
    </section>
  );
}

type DockMode = "user" | "admin";

function DockSurface({
  mode,
  label,
  items,
  pathname,
  action,
}: {
  mode: DockMode;
  label: string;
  items: NavItem[];
  pathname: string;
  action: React.ReactNode;
}) {
  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.985 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto w-full max-w-[min(100%,1200px)] self-center"
      aria-label={label}
    >
      <div
        className={`relative isolate overflow-hidden rounded-full border shadow-[0_18px_50px_rgba(18,17,16,0.18)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/30 ${
          mode === "admin"
            ? "border-ink/20 bg-ink/[0.08] ring-1 ring-white/50"
            : "border-white/70 bg-white/45 ring-1 ring-white/40"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-white/90 opacity-80"
          aria-hidden="true"
        />
        <DockSection label={label} items={items} pathname={pathname} action={action} />
      </div>
    </motion.div>
  );
}

function isAdminSidebarModuleEnabled(raw: string | undefined, moduleId: string) {
  if (!raw?.trim()) return true;
  try {
    const config = JSON.parse(raw) as Record<string, unknown>;
    const setting = config[moduleId];
    if (typeof setting === "undefined") return true;
    if (typeof setting === "object" && setting !== null && "enabled" in setting) {
      return parseModuleBoolean((setting as { enabled?: unknown }).enabled, true);
    }
    return parseModuleBoolean(setting, true);
  } catch {
    return true;
  }
}

function parseModuleBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && (value === 0 || value === 1)) return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
}

export default function AdminLayout() {
  const { user, isLoading, isAdmin, signOut } = useAppContext();
  const { t, lang, setLang } = useLang();
  const accountName =
    [user?.display_name, user?.username].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    ) ?? (user?.id ? `#${user.id}` : t("Account", "账户"));
  const location = useLocation();
  const navigate = useNavigate();
  const [taskEnabled, setTaskEnabled] = React.useState(true);
  const [dataExportEnabled, setDataExportEnabled] = React.useState(true);
  const [sidebarModulesAdmin, setSidebarModulesAdmin] = React.useState<string>();
  const [activeDock, setActiveDock] = React.useState<DockMode>("user");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [accountOpen, setAccountOpen] = React.useState(false);

  React.useEffect(() => {
    void api
      .status()
      .then((status) => {
        setTaskEnabled(status.enable_task !== false);
        setDataExportEnabled(status.enable_data_export !== false);
        setSidebarModulesAdmin(status.SidebarModulesAdmin);
      })
      .catch(() => {
        setTaskEnabled(true);
        setDataExportEnabled(true);
        setSidebarModulesAdmin(undefined);
      });
  }, []);

  const visibleItems = allNavItems.filter(
    (item) =>
      (isAdmin || !item.adminOnly) &&
      (!item.adminOnly || isAdminSidebarModuleEnabled(sidebarModulesAdmin, item.id)) &&
      (taskEnabled || !["tasks", "task-records", "midjourney-tasks"].includes(item.id)) &&
      (dataExportEnabled || item.id !== "reports"),
  );
  const userItems = visibleItems.filter((item) => !item.adminOnly);
  const adminItems = visibleItems.filter((item) => item.adminOnly);
  const isAdminRoute = adminItems.some((item) => isNavItemActive(location.pathname, item.path));

  React.useEffect(() => {
    if (!isAdmin) {
      setActiveDock("user");
      return;
    }
    setActiveDock(isAdminRoute ? "admin" : "user");
  }, [isAdmin, isAdminRoute]);

  function showUserDock() {
    setActiveDock("user");
  }

  function showAdminDock() {
    setActiveDock("admin");
  }

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!accountOpen) return;
    const closeAccount = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && !target.parentElement?.closest("[data-account-menu]")) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", closeAccount);
    return () => document.removeEventListener("mousedown", closeAccount);
  }, [accountOpen]);

  const searchResults = visibleItems.filter((item) =>
    `${item.label} ${item.path}`.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );

  async function logOut() {
    try {
      await signOut();
    } catch (cause) {
      console.error("Server logout failed; local session was cleared", cause);
    } finally {
      navigate("/login", { replace: true });
    }
  }

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-paper">
        <div className="flex flex-col items-center">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span className="absolute inset-0 border border-ink/10 animate-ping" style={{ animationDuration: "3s" }} aria-hidden="true" />
            <span className="absolute inset-2 border border-ink/30 animate-ping" style={{ animationDuration: "2s" }} aria-hidden="true" />
            <span className="h-1.5 w-1.5 bg-ink animate-pulse" aria-hidden="true" />
          </div>
          <p className="mt-6 font-mono text-overline uppercase tracking-[0.3em] text-muted">
            {t("Loading", "加载中")}
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-paper flex flex-col selection:bg-ink selection:text-paper relative font-sans">
      {/* Top Header — Editorial */}
      <header className="fixed inset-x-3 top-3 z-40 flex h-14 items-center justify-between rounded-full border border-white/70 bg-white/55 px-4 shadow-[0_10px_32px_rgba(18,17,16,0.08)] backdrop-blur-xl backdrop-saturate-150 md:inset-x-8 md:px-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-ink flex items-center justify-center shrink-0">
            <span className="text-paper font-serif font-bold text-sm leading-none">H</span>
          </div>
          <span className="font-pixel text-lg tracking-[0.04em] text-ink">
            Helstare
          </span>
          <NavLink
            to="/user-models"
            title={t("Available models", "可用模型")}
            className={({ isActive }) =>
              `hidden items-center gap-2 border-l border-ink/10 pl-3 text-caption transition-colors sm:inline-flex ${
                isActive ? "text-ink" : "text-muted hover:text-ink"
              }`
            }
          >
            <AvailableModelsIcon className="h-4 w-4 stroke-[1.5]" />
            <span>{t("Models", "可用模型")}</span>
          </NavLink>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <NotificationCenter />
          <button
            type="button"
            onClick={toggleTheme}
            title={t("Toggle theme", "切换主题")}
            aria-label={t("Toggle theme", "切换主题")}
            className="inline-flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink"
          >
            <Sun className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            title={t("Search", "搜索")}
            aria-label={t("Search", "搜索")}
            className="inline-flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="text-overline font-mono uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
            aria-label="Toggle language"
          >
            {lang === "en" ? "EN" : "ZH"}
          </button>
          <div className="relative" data-account-menu>
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              className="inline-flex items-center gap-2 text-overline font-mono uppercase tracking-[0.2em] text-ink/60 hover:text-ink transition-colors"
            >
              <UserCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{accountName}</span>
            </button>
            {accountOpen && (
              <div role="menu" className="absolute right-0 top-9 z-[120] min-w-48 border border-ink/10 bg-paper/95 p-2 shadow-floating backdrop-blur-xl">
                <div className="border-b border-ink/10 px-3 py-2">
                  <p className="truncate text-caption text-ink">{accountName}</p>
                  <p className="truncate font-mono text-micro text-muted">{user.email || user.username || `#${user.id}`}</p>
                </div>
                {[
                  ["/profile", t("Profile", "个人资料")],
                  ["/settings", t("Settings", "设置")],
                  ["/security", t("Security", "安全中心")],
                ].map(([path, label]) => (
                  <button key={path} type="button" role="menuitem" onClick={() => { setAccountOpen(false); navigate(path); }} className="flex w-full px-3 py-2 text-left text-caption text-muted hover:bg-ink/5 hover:text-ink">
                    {label}
                  </button>
                ))}
                <button type="button" role="menuitem" onClick={() => void logOut()} className="flex w-full border-t border-ink/10 px-3 py-2 text-left text-caption text-danger hover:bg-danger/5">
                  {t("Sign out", "退出登录")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="pt-20 md:pt-24">
        <NoticeBanner />
      </div>

      {searchOpen && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center bg-ink/20 px-4 pt-24 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("Search navigation", "搜索导航")}>
          <div className="w-full max-w-xl overflow-hidden border border-white/70 bg-paper/90 shadow-floating backdrop-blur-2xl">
            <div className="flex items-center gap-3 border-b border-ink/10 px-4">
              <Search className="h-4 w-4 text-muted" />
              <input
                autoFocus
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("Search pages...", "搜索页面...")}
                className="h-12 flex-1 bg-transparent text-body outline-none"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label={t("Close", "关闭")} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav aria-label={t("Search results", "搜索结果")} className="max-h-[min(28rem,60vh)] overflow-y-auto p-2">
              {searchResults.length > 0 ? searchResults.map((item) => {
                const Icon = item.icon;
                return <NavLink key={item.id} to={item.path} onClick={() => { setSearchOpen(false); setSearchTerm(""); }} className="flex items-center gap-3 px-3 py-2.5 text-caption text-muted hover:bg-ink/5 hover:text-ink"><Icon className="h-4 w-4" /><span>{item.label}</span><span className="ml-auto font-mono text-micro text-muted/70">{item.path}</span></NavLink>;
              }) : <p className="px-3 py-8 text-center text-caption text-muted">{t("No matching pages.", "没有匹配的页面。")}</p>}
            </nav>
          </div>
        </div>
      )}

      {/* Two independent glass docks share one viewport; only the selected dock is mounted. */}
      <div className="pointer-events-none fixed inset-x-2 bottom-2 z-[100] md:inset-x-4 md:bottom-4">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-2">
          <AnimatePresence mode="wait" initial={false}>
            {activeDock === "admin" && isAdmin && adminItems.length > 0 ? (
              <DockSurface
                mode="admin"
                label={t("Admin area", "管理员区")}
                items={adminItems}
                pathname={location.pathname}
                action={
                  <button
                    type="button"
                    onClick={showUserDock}
                    title={t("Switch to user dock", "切换到用户码头")}
                    aria-label={t("Switch to user dock", "切换到用户码头")}
                    className="group flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-all hover:bg-white/60 hover:text-ink"
                  >
                    <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
                  </button>
                }
              />
            ) : (
              <DockSurface
                mode="user"
                label={t("User area", "用户区")}
                items={userItems}
                pathname={location.pathname}
                action={
                  isAdmin && adminItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={showAdminDock}
                      title={t("Switch to admin dock", "切换到管理员码头")}
                      aria-label={t("Switch to admin dock", "切换到管理员码头")}
                      className="group flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-all hover:bg-white/60 hover:text-ink"
                    >
                      <Settings2 className="h-[18px] w-[18px]" aria-hidden="true" />
                      <ArrowRight className="sr-only" aria-hidden="true" />
                    </button>
                  ) : undefined
                }
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col pb-44 pt-20 md:pb-36 md:pt-24">
        <div className="flex-1 p-0 sm:p-4 md:p-8 w-full flex flex-col">
          <Outlet />
        </div>
      </main>

      <PaymentComplianceGate />
    </div>
  );
}
