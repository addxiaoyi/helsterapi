import { Bell, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, type ApiStatus } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

type Announcement = {
  id?: string | number;
  title?: string;
  extra?: string;
  content?: string;
  publishDate?: string;
};

const STORAGE_KEY = "helstare:notifications:read";

function keyFor(item: Announcement) {
  return String(item.id ?? `${item.publishDate ?? ""}:${item.content ?? ""}`);
}

export default function NotificationCenter() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"notice" | "announcements">("notice");
  const [notice, setNotice] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [read, setRead] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    void Promise.all([api.notice(), api.status()]).then(([noticeValue, status]) => {
      setNotice(typeof noticeValue === "string" ? noticeValue.trim() : "");
      const values = (status as ApiStatus).announcements;
      setAnnouncements(Array.isArray(values) ? values.slice(0, 20) as Announcement[] : []);
    }).catch(() => undefined);
  }, []);

  const unread = useMemo(() => announcements.filter((item) => !read.has(keyFor(item))).length + (notice && !read.has(`notice:${notice}`) ? 1 : 0), [announcements, notice, read]);

  function markRead(keys: string[]) {
    setRead((current) => {
      const next = new Set([...current, ...keys]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function show(nextTab: "notice" | "announcements") {
    setTab(nextTab);
    setOpen(true);
    markRead(nextTab === "notice" && notice ? [`notice:${notice}`] : announcements.map(keyFor));
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => show(tab)} aria-label={t("Notifications", "通知")} className="relative inline-flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-ink">
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-1 text-[9px] leading-none text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && <div className="fixed inset-x-3 top-20 z-[210] max-h-[calc(100dvh-6rem)] w-auto overflow-hidden border border-ink/10 bg-paper p-4 shadow-floating sm:absolute sm:inset-x-auto sm:right-0 sm:top-10 sm:max-h-none sm:w-[min(24rem,calc(100vw-2rem))]">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-lg text-ink">{t("Notifications", "通知中心")}</h2><button type="button" onClick={() => setOpen(false)} aria-label={t("Close", "关闭")} className="text-muted hover:text-ink"><X className="h-4 w-4" /></button></div>
        <div className="mb-3 flex border-b border-ink/10 text-caption"><button type="button" onClick={() => show("notice")} className={`px-3 py-2 ${tab === "notice" ? "border-b-2 border-ink text-ink" : "text-muted"}`}>{t("Notice", "通知")}</button><button type="button" onClick={() => show("announcements")} className={`px-3 py-2 ${tab === "announcements" ? "border-b-2 border-ink text-ink" : "text-muted"}`}>{t("Announcements", "公告")}</button></div>
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {tab === "notice" ? (notice ? <p className="whitespace-pre-wrap text-label leading-relaxed text-ink">{notice}</p> : <p className="text-caption text-muted">{t("No notice", "暂无通知")}</p>) : (announcements.length ? announcements.map((item) => <article key={keyFor(item)} className="border-b border-ink/10 pb-3 last:border-0"><h3 className="text-label font-medium text-ink">{item.title ?? item.extra ?? t("Announcement", "公告")}</h3><p className="mt-1 whitespace-pre-wrap text-caption leading-relaxed text-muted">{item.content ?? ""}</p>{item.publishDate && <time className="mt-2 block text-micro text-muted">{item.publishDate}</time>}</article>) : <p className="text-caption text-muted">{t("No announcements", "暂无公告")}</p>)}
        </div>
      </div>}
    </div>
  );
}
