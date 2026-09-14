import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../../lib/LanguageContext";
import DOMPurify from "dompurify";
import { api, type ApiStatus } from "../../lib/api";

type FooterLink = [label: string, path: string];

export function PublicFooter() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [online, setOnline] = useState<boolean>();
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean>();
  const [docsLink, setDocsLink] = useState("/docs");
  const [systemName, setSystemName] = useState("Helstare OS");
  const [footerHtml, setFooterHtml] = useState("");

  useEffect(() => {
    void api
      .status()
      .then((status: ApiStatus) => {
        setOnline(true);
        if (status.system_name?.trim())
          setSystemName(status.system_name.trim());
        setRegistrationEnabled(
          status.register_enabled !== false &&
            status.password_register_enabled !== false,
        );
        if (status.docs_link?.trim()) setDocsLink(status.docs_link.trim());
        const rawFooter = status.footer_html?.trim() || "";
        setFooterHtml(DOMPurify.sanitize(rawFooter, { ALLOWED_TAGS: ["a", "b", "i", "em", "strong", "br", "p", "span"], ALLOWED_ATTR: ["href", "target", "rel"] }));
      })
      .catch(() => {
        setOnline(false);
        setRegistrationEnabled(false);
      });
  }, []);

  const navigation: FooterLink[] = [
    [t("Home", "首页"), "/"],
    [t("Pricing", "模型定价"), "/pricing"],
    [t("Rankings", "排行榜"), "/rankings"],
    [t("API Docs", "开发者文档"), docsLink],
    [t("About", "关于我们"), "/about"],
  ];
  const goTo = (path: string) => {
    if (/^https?:\/\//i.test(path)) {
      window.location.assign(path);
      return;
    }
    navigate(path);
  };

  return (
    <footer className="w-full border-t border-[#121110]/10 bg-primary px-6 pb-8 pt-16 md:px-12 lg:px-24">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <h3 className="mb-4 font-serif text-xl text-[#121110]">
              {systemName}
            </h3>
            {footerHtml ? (
              <div
                className="prose prose-sm mb-6 max-w-sm text-label leading-relaxed text-muted"
                dangerouslySetInnerHTML={{ __html: footerHtml }}
              />
            ) : (
              <p className="mb-6 max-w-sm text-label leading-relaxed text-muted">
                {t(
                  "Orchestrating intelligence. A meticulously crafted gateway for the modern AI era, delivering a singular, elegant endpoint.",
                  "编排智能。为现代 AI 时代精心打造的网关，提供单一、优雅的端点。",
                )}
              </p>
            )}
          </div>
          <FooterLinks
            title={t("Navigation", "导航")}
            links={navigation}
            onNavigate={goTo}
          />
          <div>
            <h4 className="mb-6 text-overline font-mono uppercase tracking-[0.2em] text-[#121110]">
              {t("System", "系统")}
            </h4>
            <ul className="space-y-4">
              <li>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-label text-muted hover:text-[#121110]"
                >
                  {t("Sign In", "登录控制台")}
                </button>
              </li>
              {registrationEnabled && (
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="group flex items-center gap-2 text-label text-muted hover:text-[#121110]"
                  >
                    {t("Register", "注册账号")}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#121110]/10 pt-8 sm:flex-row">
          <p className="text-micro font-mono uppercase tracking-widest text-muted">
            &copy; {new Date().getFullYear()} {systemName}.{" "}
            {t("All rights reserved.", "保留所有权利。")}
          </p>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 ${online === true ? "bg-green-500" : online === false ? "bg-red-500" : "bg-[#7A7772]"}`}
            />
            <span className="text-overline font-mono uppercase tracking-widest text-muted">
              {online === true
                ? t("All Systems Operational", "所有系统运行正常")
                : online === false
                  ? t("System Unavailable", "系统不可用")
                  : t("Checking System", "正在检查系统")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({
  title,
  links,
  onNavigate,
}: {
  title: string;
  links: FooterLink[];
  onNavigate: (path: string) => void;
}) {
  return (
    <div>
      <h4 className="mb-6 text-overline font-mono uppercase tracking-[0.2em] text-[#121110]">
        {title}
      </h4>
      <ul className="space-y-4">
        {links.map(([label, path]) => (
          <li key={path}>
            <button
              type="button"
              onClick={() => onNavigate(path)}
              className="text-label text-muted hover:text-[#121110]"
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
