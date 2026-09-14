import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Filter, RefreshCw, X, Download } from "lucide-react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { ApiError, api, type Page } from "../../lib/api";
import { useLang } from "../../lib/LanguageContext";
import { SelectMenu } from "../../components/ui/SelectMenu";
import { displayChannelName } from "../../lib/channelDisplay";
import { useToast } from "../../components/ui/Toast";
import { downloadCsv, type CsvColumn } from "../../lib/io";

type Row = Record<string, unknown> & { id: string | number };

function readNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatTime(value: unknown): string {
  const n = readNumber(value);
  if (n <= 0) return "-";
  return n > 1e12
    ? new Date(n).toLocaleString()
    : new Date(n * 1000).toLocaleString();
}

function statusVariant(status: unknown) {
  const s = String(status ?? "").toLowerCase();
  if (
    s === "success" ||
    s === "succeeded" ||
    s === "completed" ||
    s === "done"
  ) {
    return {
      className: "border-green-700 bg-green-50 text-green-700",
      label: "Success",
    };
  }
  if (
    s === "pending" ||
    s === "queued" ||
    s === "running" ||
    s === "in_progress" ||
    s === "processing" ||
    s === "submitted"
  ) {
    return {
      className: "border-yellow-600 bg-yellow-50 text-yellow-700",
      label: "Pending",
    };
  }
  if (
    s === "failure" ||
    s === "failed" ||
    s === "error" ||
    s === "cancelled" ||
    s === "canceled"
  ) {
    return {
      className: "border-red-700 bg-red-50 text-red-700",
      label: s === "cancelled" || s === "canceled" ? "Cancelled" : "Failed",
    };
  }
  return {
    className: "border-ink/20 bg-paper text-muted",
    label: s || "Unknown",
  };
}

const EXPORT_KEYS = [
  "id",
  "status",
  "progress",
  "user_id",
  "username",
  "model",
  "model_name",
  "channel",
  "channel_name",
  "channel_id",
  "platform",
  "action",
  "submit_time",
  "start_time",
  "finish_time",
  "created_at",
  "create_time",
  "quota",
  "result_url",
  "fail_reason",
] as const;

function exportTasks(rows: Row[]) {
  if (rows.length === 0) return;
  const columns: CsvColumn<Row>[] = EXPORT_KEYS.map((key) => ({
    key: key as string,
    header: key,
  }));
  downloadCsv("task-records.csv", rows, columns);
}

function Records({
  midjourney = false,
  user = false,
}: {
  midjourney?: boolean;
  user?: boolean;
}) {
  const { t } = useLang();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<Page<Row>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await (user
        ? api.userTasks(page, {
            status: statusFilter || undefined,
            platform: platformFilter || undefined,
            action: actionFilter || undefined,
          })
        : midjourney
          ? api.midjourneyTasks(page)
          : api.tasks(page, {
              status: statusFilter || undefined,
              platform: platformFilter || undefined,
              action: actionFilter || undefined,
            }));
      setResponse({
        ...result,
        items: result.items.map((row, index) => ({
          ...row,
          id: (row.id ?? row.task_id ?? row.mj_id ?? index) as string | number,
        })),
      });
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : t("Unable to load task records.", "无法加载任务记录。");
      setError(message);
      toast.error({ message });
    } finally {
      setLoading(false);
    }
  }, [
    actionFilter,
    midjourney,
    page,
    platformFilter,
    statusFilter,
    t,
    toast,
    user,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    return response.items.filter((row) => {
      if (!lower) return true;
      return JSON.stringify(row).toLowerCase().includes(lower);
    });
  }, [response.items, statusFilter, keyword]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const row of response.items) {
      const status = String(row.status ?? "");
      if (status) set.add(status);
    }
    return Array.from(set);
  }, [response.items]);

  const columns = [
    {
      key: "id",
      title: "ID",
      render: (row: Row) => (
        <span className="font-mono text-caption">
          {String(row.id ?? row.task_id ?? row.mj_id ?? "-")}
        </span>
      ),
    },
    {
      key: "status",
      title: t("Status", "状态"),
      render: (row: Row) => {
        const variant = statusVariant(row.status);
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 text-overline font-mono uppercase border ${variant.className}`}
          >
            {variant.label}
          </span>
        );
      },
    },
    {
      key: "progress",
      title: t("Progress", "进度"),
      render: (row: Row) => (
        <span className="font-mono text-caption text-muted">
          {String(row.progress ?? "-")}
        </span>
      ),
    },
    {
      key: "user_id",
      title: t("User", "用户"),
      render: (row: Row) => (
        <span className="font-mono text-caption text-muted">
          {String(row.user_id ?? row.username ?? "-")}
        </span>
      ),
    },
    {
      key: "model",
      title: t("Model", "模型"),
      render: (row: Row) => (
        <span className="font-mono text-caption">
          {String(row.model ?? row.model_name ?? "-")}
        </span>
      ),
    },
    {
      key: "channel",
      title: t("Channel", "渠道"),
      render: (row: Row) => (
        <span className="text-caption text-muted">
          {displayChannelName(String(row.channel ?? row.channel_name ?? row.channel_id ?? "-"))}
        </span>
      ),
    },
    {
      key: "created_at",
      title: t("Created", "创建时间"),
      render: (row: Row) => (
        <span className="font-mono text-caption text-muted">
          {formatTime(row.created_at ?? row.create_time)}
        </span>
      ),
    },
    {
      key: "result_url",
      title: t("Result", "结果"),
      render: (row: Row) => {
        const url = String(row.result_url ?? "").trim();
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption text-[#121110] underline underline-offset-2 hover:opacity-60"
          >
            {t("Open", "打开")}
          </a>
        ) : (
          <span className="text-caption text-muted">-</span>
        );
      },
    },
    {
      key: "actions",
      title: t("Actions", "操作"),
      render: (row: Row) => {
        return (
          <div className="flex items-center gap-3 text-muted">
            <button
              type="button"
              title={t("View detail", "查看详情")}
              onClick={() => setSelectedRow(row)}
              className="hover:text-[#121110]"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <PageContainer
      title={t(
        user ? "My Tasks" : midjourney ? "Midjourney Tasks" : "Task Records",
        user ? "我的任务" : midjourney ? "Midjourney 任务" : "任务记录",
      )}
      subtitle={t(
        "Review and manage backend task records.",
        "查看并管理后端任务记录。",
      )}
      isLoading={loading}
      error={error}
      onRetry={load}
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 border px-3 py-2 text-overline font-mono uppercase ${
              showFilters
                ? "border-[#121110] bg-inverse text-[#FAFAFA]"
                : "border-[#121110]/20 text-[#121110] hover:border-[#121110]"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {t("Filters", "筛选")}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("Refresh", "刷新")}
          </button>
          <button
            type="button"
            onClick={() => exportTasks(response.items)}
            disabled={loading || response.items.length === 0}
            className="flex items-center gap-2 border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      }
    >
      {showFilters && (
        <div className="mb-4 grid grid-cols-1 gap-3 border border-[#121110]/10 bg-white p-4 md:grid-cols-4">
          <label className="space-y-1 text-overline font-mono uppercase">
            <span>{t("Status", "状态")}</span>
            <SelectMenu value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }} options={[{ value: "", label: t("All statuses", "所有状态") }, ...uniqueStatuses.map((status) => ({ value: status, label: status }))]} />
          </label>
          {!midjourney && (
            <>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Platform", "平台")}</span>
                <input
                  value={platformFilter}
                  onChange={(event) => {
                    setPlatformFilter(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("e.g. midjourney", "例如 midjourney")}
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-[12px] outline-none"
                />
              </label>
              <label className="space-y-1 text-overline font-mono uppercase">
                <span>{t("Action", "动作")}</span>
                <input
                  value={actionFilter}
                  onChange={(event) => {
                    setActionFilter(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("e.g. imagine", "例如 imagine")}
                  className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-[12px] outline-none"
                />
              </label>
            </>
          )}
          <label className="space-y-1 text-overline font-mono uppercase md:col-span-2">
            <span>{t("Keyword", "关键字")}</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t(
                "Filter by ID / user / payload",
                "按 ID/用户/载荷过滤",
              )}
              className="w-full border-b border-[#121110]/20 bg-transparent px-1 py-2 text-[12px] outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("");
              setPlatformFilter("");
              setActionFilter("");
              setKeyword("");
              setPage(1);
            }}
            className="flex items-center gap-2 self-end border border-[#121110]/20 px-3 py-2 text-overline font-mono uppercase"
          >
            <X className="h-3.5 w-3.5" />
            {t("Reset", "重置")}
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
        <DataTable
          columns={columns}
          data={filteredItems as Array<Row & { id: string | number }>}
          total={response.total}
          page={page}
          pageSize={response.page_size}
          onPageChange={setPage}
        />
        <aside className="border border-[#121110]/10 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 font-serif text-lg">
            <Eye className="h-4 w-4" />
            {t("Detail", "详情")}
          </h3>
          {selectedRow === null ? (
            <p className="text-[12px] text-muted">
              {t(
                "Click the eye icon on a row to inspect its raw payload.",
                "点击行上的眼睛图标查看原始数据。",
              )}
            </p>
          ) : (
            <div className="space-y-4">
              {String(selectedRow.fail_reason ?? "").trim() && (
                <div className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  <strong>{t("Failure reason", "失败原因")}: </strong>
                  {String(selectedRow.fail_reason)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 border-b border-[#121110]/10 pb-3 text-micro text-muted">
                <span>
                  {t("Submitted", "提交")}:{" "}
                  {formatTime(selectedRow.submit_time)}
                </span>
                <span>
                  {t("Started", "开始")}: {formatTime(selectedRow.start_time)}
                </span>
                <span>
                  {t("Finished", "完成")}: {formatTime(selectedRow.finish_time)}
                </span>
                <span>
                  {t("Quota", "额度")}: {String(selectedRow.quota ?? "-")}
                </span>
              </div>
              <pre className="max-h-[30rem] overflow-auto whitespace-pre-wrap break-all font-mono text-caption">
                {JSON.stringify(selectedRow, null, 2)}
              </pre>
            </div>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}

export function TaskRecords() {
  return <Records />;
}
export function MidjourneyRecords() {
  return <Records midjourney />;
}
export function UserTaskRecords() {
  return <Records user />;
}
