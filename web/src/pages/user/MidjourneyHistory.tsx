import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Image as ImageIcon, RefreshCw } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { useToast } from "../../components/ui/Toast";
import { api } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";

type MidjourneyTask = {
  id?: number;
  mj_id?: string;
  action?: string;
  prompt?: string;
  state?: string;
  status?: string;
  progress?: string;
  image_url?: string;
  video_url?: string;
  fail_reason?: string;
  submit_time?: number;
  finish_time?: number;
};

function formatTime(value?: number) {
  if (!value) return "-";
  return new Date(value * 1000).toLocaleString();
}

export default function MidjourneyHistory() {
  const { t } = useLang();
  const toast = useToast();
  const [items, setItems] = useState<MidjourneyTask[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [mjId, setMjId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.userMidjourneyTasks(page, {
        mj_id: mjId.trim() || undefined,
        start_timestamp: startDate
          ? Math.floor(new Date(`${startDate}T00:00:00`).getTime() / 1000)
          : undefined,
        end_timestamp: endDate
          ? Math.floor(new Date(`${endDate}T23:59:59.999`).getTime() / 1000)
          : undefined,
      });
      setItems(response.items as MidjourneyTask[]);
      setTotal(response.total);
      setPageSize(response.page_size || 10);
    } catch (cause) {
      setItems([]);
      setTotal(0);
      const msg =
        cause instanceof Error
          ? cause.message
          : t(
              "Unable to load Midjourney history.",
              "无法加载 Midjourney 历史记录。",
            );
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [endDate, mjId, page, startDate, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title={t("Midjourney History", "Midjourney 历史")}
      subtitle={t(
        "Review your image generation tasks and results.",
        "查看您的图片生成任务和结果。",
      )}
      isLoading={loading}
      error={error}
      onRetry={load}
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
          <label className="text-overline font-mono uppercase tracking-widest text-muted">
            <span className="mb-1 block">{t("Task ID", "任务 ID")}</span>
            <input
              value={mjId}
              onChange={(event) => {
                setMjId(event.target.value);
                setPage(1);
              }}
              placeholder={t("Search by task ID", "按任务 ID 搜索")}
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-[12px] outline-none"
            />
          </label>
          <label className="text-overline font-mono uppercase tracking-widest text-muted">
            <span className="mb-1 block">{t("From", "开始日期")}</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-[12px] outline-none"
            />
          </label>
          <label className="text-overline font-mono uppercase tracking-widest text-muted">
            <span className="mb-1 block">{t("To", "结束日期")}</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-[12px] outline-none"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          title={t("Refresh", "刷新")}
          className="flex items-center gap-2 border border-[#121110]/15 px-3 py-2 text-micro font-mono uppercase"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {t("Refresh", "刷新")}
        </button>
      </div>
      {items.length === 0 ? (
        <div className="border border-[#121110]/10 bg-white px-6 py-16 text-center text-[12px] text-muted">
          {t("No Midjourney tasks found.", "暂无 Midjourney 任务。")}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => {
            const media = item.image_url || item.video_url;
            const status = item.status || item.state || "-";
            return (
              <article
                key={item.id ?? item.mj_id ?? index}
                className="border border-[#121110]/10 bg-white p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3 text-overline font-mono uppercase text-muted">
                      <span>{item.action || "imagine"}</span>
                      <span>{status}</span>
                      {item.progress && <span>{item.progress}</span>}
                      <span>{formatTime(item.submit_time)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-label text-[#121110]">
                      {item.prompt || "-"}
                    </p>
                    {item.fail_reason && (
                      <p className="mt-3 text-[12px] text-red-600">
                        {item.fail_reason}
                      </p>
                    )}
                  </div>
                  {media && (
                    <a
                      href={media}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative block h-32 w-full shrink-0 overflow-hidden border border-[#121110]/10 bg-primary md:w-48"
                      title={t("Open result", "打开结果")}
                    >
                      {item.video_url && !item.image_url ? (
                        <video
                          src={media}
                          className="h-full w-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={media}
                          alt={item.prompt || "Midjourney result"}
                          className="h-full w-full object-cover"
                        />
                      )}
                      <span className="absolute bottom-2 right-2 bg-inverse/80 p-1.5 text-white">
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                  )}
                  {!media && (
                    <ImageIcon className="h-8 w-8 shrink-0 text-muted" />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {total > pageSize && (
        <div className="mt-6 flex items-center justify-between text-micro font-mono text-muted">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="border border-[#121110]/15 px-3 py-2 disabled:opacity-40"
          >
            {t("Previous", "上一页")}
          </button>
          <span>{page}</span>
          <button
            type="button"
            disabled={page * pageSize >= total}
            onClick={() => setPage((value) => value + 1)}
            className="border border-[#121110]/15 px-3 py-2 disabled:opacity-40"
          >
            {t("Next", "下一页")}
          </button>
        </div>
      )}
    </PageContainer>
  );
}
