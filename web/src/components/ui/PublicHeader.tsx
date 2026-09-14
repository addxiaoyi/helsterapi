import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLang } from "../../lib/LanguageContext";
import { ArrowLeft, Menu, X } from "lucide-react";
import { api, type ApiStatus } from "../../lib/api";
import { useApp } from "../../lib/AppContext";

function isHeaderModuleEnabled(raw: string | undefined, moduleName: string) {
  if (!raw?.trim()) return true;
  try {
    const config = JSON.parse(raw) as Record<string, unknown>;
    const setting = config[moduleName];
    if (typeof setting === "boolean") return setting;
    if (setting && typeof setting === "object" && "enabled" in setting)
      return parseHeaderNavBoolean(
        (setting as { enabled?: unknown }).enabled,
        true,
      );
    return parseHeaderNavBoolean(setting, true);
  } catch {
    return true;
  }
  return true;
}

function parseHeaderNavBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
}

function requiresHeaderModuleAuth(raw: string | undefined, moduleName: string) {
  if (!raw?.trim()) return false;
  try {
    const config = JSON.parse(raw) as Record<string, unknown>;
    const setting = config[moduleName];
    return Boolean(
      setting &&
      typeof setting === "object" &&
      "requireAuth" in setting &&
      parseHeaderNavBoolean(
        (setting as { requireAuth?: unknown }).requireAuth,
        false,
      ),
    );
  } catch {
    return false;
  }
}

export function PublicHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, t } = useLang();
  const { user } = useApp();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [status, setStatus] = useState<ApiStatus>({});
  const isHome = location.pathname === "/";
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    void api
      .status()
      .then(setStatus)
      .catch((cause) => {
        console.error("Unable to load public header status", cause);
      });
  }, []);
  const docsLink = status.docs_link?.trim() || "/docs";
  const navLinks = [
    { name: t("Home", "首页"), path: "/", module: "home" },
    { name: t("Pricing", "模型定价"), path: "/pricing", module: "pricing" },
    { name: t("Rankings", "排行榜"), path: "/rankings", module: "rankings" },
    { name: t("API Docs", "开发者文档"), path: docsLink, module: "docs" },
    { name: t("About", "关于我们"), path: "/about", module: "about" },
  ].filter(
    (link) =>
      isHeaderModuleEnabled(status.HeaderNavModules, link.module) &&
      (!requiresHeaderModuleAuth(status.HeaderNavModules, link.module) ||
        user !== null),
  );
  const goTo = (path: string) => {
    if (/^https?:\/\//i.test(path)) {
      window.location.assign(path);
      return;
    }
    navigate(path);
  };
  return (
    <>
      {" "}
      <header
        className={`fixed top-0 left-0 right-0 h-16 z-50 transition-all duration-300 border-b ${isScrolled || !isHome ? "paper-glass border-transparent" : "bg-transparent border-transparent"}`}
      >
        {" "}
        <div className="max-w-[1400px] mx-auto h-full px-6 md:px-12 flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-4">
            {" "}
            {!isHome && (
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center border border-[#121110]/10 text-[#121110] hover:bg-inverse hover:text-[#FAFAFA] transition-colors rounded-none"
                title={t("Go Back", "返回上一页")}
              >
                {" "}
                <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />{" "}
              </button>
            )}{" "}
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 group"
            >
              {" "}
              <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-inverse transition-transform duration-300 group-hover:scale-90">
                {status.logo ? (
                  <img
                    src={status.logo}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-sm font-serif font-bold leading-none text-[#FAFAFA]">
                    H
                  </span>
                )}
              </div>{" "}
              <span className="font-pixel text-lg tracking-[0.04em] text-[#121110] group-hover:opacity-70 transition-opacity">
                {" "}
                {status.system_name || "Helstare OS"}{" "}
              </span>{" "}
            </button>{" "}
          </div>{" "}
          {/* Desktop Navigation */}{" "}
          <nav className="hidden md:flex items-center gap-8">
            {" "}
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => goTo(link.path)}
                className={`text-[12px] font-mono uppercase tracking-[0.15em] transition-colors ${location.pathname === link.path ? "text-[#121110] font-medium" : "text-muted hover:text-[#121110]"}`}
              >
                {" "}
                {link.name}{" "}
              </button>
            ))}{" "}
          </nav>{" "}
          <div className="flex items-center gap-4">
            {" "}
            <button
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              className="text-overline font-mono uppercase tracking-widest text-muted hover:text-[#121110] transition-colors"
            >
              {" "}
              {lang === "en" ? "EN" : "ZH"}{" "}
            </button>{" "}
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:flex items-center justify-center px-5 py-2 border border-[#121110]/10 text-[#121110] text-overline font-mono uppercase tracking-widest hover:border-[#121110] hover:bg-white transition-all duration-300 rounded-none shadow-sm active:scale-95"
            >
              {" "}
              {t("Sign In", "登录控制台")}{" "}
            </button>{" "}
            <button
              className="md:hidden w-8 h-8 flex items-center justify-center text-[#121110]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {" "}
              {mobileMenuOpen ? (
                <X className="w-5 h-5 stroke-[1.5]" />
              ) : (
                <Menu className="w-5 h-5 stroke-[1.5]" />
              )}{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </header>{" "}
      {/* Mobile Menu */}{" "}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-primary pt-20 px-6 animate-in fade-in duration-300 md:hidden">
          {" "}
          <nav className="flex flex-col gap-6">
            {" "}
            {navLinks.map((link, index) => (
              <button
                key={link.path}
                onClick={() => {
                  setMobileMenuOpen(false);
                  goTo(link.path);
                }}
                className={`text-left text-2xl font-serif tracking-tight py-2 border-b border-[#121110]/5 transition-all duration-300 animate-in slide-in-from-left-4 fade-in fill-mode-both ${location.pathname === link.path ? "text-[#121110] pl-2 border-[#121110]" : "text-muted"}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {" "}
                {link.name}{" "}
              </button>
            ))}{" "}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/login");
              }}
              className="mt-4 flex items-center justify-center w-full py-4 bg-inverse text-[#FAFAFA] text-[12px] font-mono uppercase tracking-widest hover:bg-black transition-all duration-300 active:scale-[0.98] ease-out-expo rounded-none animate-in fade-in fill-mode-both"
              style={{ animationDelay: `${navLinks.length * 50 + 50}ms` }}
            >
              {" "}
              {t("Sign In", "登录控制台")}{" "}
            </button>{" "}
          </nav>{" "}
        </div>
      )}{" "}
    </>
  );
}
