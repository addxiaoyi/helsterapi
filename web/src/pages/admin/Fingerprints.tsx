import { useLang } from "../../lib/LanguageContext";
import { RefreshCw, Search, Users, Copy, Download } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { PageContainer } from "../../components/ui/PageContainer";
import { DataTable } from "../../components/ui/DataTable";
import { api, type ApiFingerprint } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { downloadJson } from "../../lib/io";

type FingerprintRow = ApiFingerprint & {
  hash: string;
  accounts: number;
  lastSeen: string;
  risk: "Low" | "Medium" | "High";
};
export default function Fingerprints() {
  const { t } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [fingerprints, setFingerprints] = useState<ApiFingerprint[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lookup, setLookup] = useState("");
  const [auditPayload, setAuditPayload] = useState<unknown>(null);
  const loadFingerprints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.fingerprints(page, search.trim() || undefined);
      setFingerprints(response.items);
      setTotal(response.total);
    } catch (cause) {
      setFingerprints([]);
      setTotal(0);
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load fingerprints.", "无法加载指纹记录。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, t, toast]);
  useEffect(() => {
    void loadFingerprints();
  }, [loadFingerprints]);
  async function findUsers() {
    if (!lookup.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      setAuditPayload(
        await api.fingerprintUsers(1, lookup.trim(), lookup.trim()),
      );
      toast.success({ message: t("Lookup complete", "查找完成") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to find matching users.", "无法查找匹配用户。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsLoading(false);
    }
  }
  async function loadDuplicates() {
    setIsLoading(true);
    setError(null);
    try {
      setAuditPayload(await api.duplicateFingerprints(1));
      toast.success({ message: t("Duplicates loaded", "重复指纹已加载") });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("Unable to load duplicate fingerprints.", "无法加载重复指纹。");
      setError(message);
      toast.error({ message });
    } finally {
      setIsLoading(false);
    }
  }
  const exportAudit = () => {
    if (auditPayload === null) {
      toast.info({
        message: t(
          "Run a lookup or duplicate check first.",
          "请先执行查找或重复检查。",
        ),
      });
      return;
    }
    downloadJson(
      `fingerprint-audit-${new Date().toISOString().slice(0, 10)}.json`,
      auditPayload,
    );
    toast.success({
      message: t("JSON exported", "JSON 已导出"),
    });
  };
  const filtered: FingerprintRow[] = fingerprints.map((item) => ({
    ...item,
    hash: item.visitor_id,
    accounts: 1,
    lastSeen: item.record_time
      ? new Date(item.record_time).toLocaleString()
      : "-",
    risk: "Low",
  }));
  const columns = [
    {
      key: "hash",
      title: "Device Identity",
      render: (r: FingerprintRow) => (
        <span className="font-mono text-caption text-muted truncate max-w-[150px] block">
          {r.hash}
        </span>
      ),
    },
    {
      key: "ip",
      title: "Origin IP",
      render: (r: FingerprintRow) => (
        <span className="font-mono text-caption">{r.ip}</span>
      ),
    },
    {
      key: "accounts",
      title: "Associated Identities",
      render: (r: FingerprintRow) => (
        <span className="font-mono text-caption">{r.accounts}</span>
      ),
    },
    {
      key: "lastSeen",
      title: t("Last Activity", "最后活动"),
      render: (r: FingerprintRow) => (
        <span className="font-mono text-caption">{r.lastSeen}</span>
      ),
    },
    {
      key: "risk",
      title: t("Threat Level", "威胁等级"),
      render: (r: FingerprintRow) => (
        <span
          className={`text-overline font-mono uppercase tracking-widest ${r.risk === "High" ? "text-red-600 font-bold" : r.risk === "Medium" ? "text-yellow-600" : "text-[#121110]"}`}
        >
          {" "}
          {t(
            r.risk,
            r.risk === "High"
              ? "高危"
              : r.risk === "Medium"
                ? "中度"
                : "低风险",
          )}{" "}
        </span>
      ),
    },
  ];
  return (
    <PageContainer
      title={t("Risk & Fingerprinting", "风控与指纹")}
      subtitle={t(
        "Identify malicious actors, multi-account abuse, and anomalic signatures.",
        "识别恶意行为者、多账户滥用和异常签名。",
      )}
      isLoading={isLoading}
      error={error}
      onRetry={loadFingerprints}
      actions={[
        {
          label: t("Refresh", "刷新"),
          icon: <RefreshCw className="h-3.5 w-3.5" />,
          onClick: () => void loadFingerprints(),
          disabled: isLoading,
        },
        {
          label: t("Duplicates", "重复指纹"),
          icon: <Copy className="h-3.5 w-3.5" />,
          onClick: () => void loadDuplicates(),
          disabled: isLoading,
        },
        {
          label: t("Find users", "查找用户"),
          icon: <Users className="h-3.5 w-3.5" />,
          onClick: () => void findUsers(),
          disabled: isLoading || !lookup.trim(),
        },
        {
          label: t("Export JSON", "导出 JSON"),
          icon: <Download className="h-3.5 w-3.5" />,
          onClick: exportAudit,
          disabled: auditPayload === null,
          variant: "secondary" as const,
        },
      ]}
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="flex min-w-64 items-center gap-2 border-b border-[#121110]/20 px-2 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={lookup}
            onChange={(event) => setLookup(event.target.value)}
            placeholder={t("Visitor ID or IP", "访客 ID 或 IP")}
            className="w-full bg-transparent text-[12px] outline-none"
          />
        </label>
      </div>
      {auditPayload !== null && (
        <pre className="mb-5 max-h-64 overflow-auto whitespace-pre-wrap break-all border border-[#121110]/10 bg-white p-4 font-mono text-caption">
          {JSON.stringify(auditPayload, null, 2)}
        </pre>
      )}{" "}
      <DataTable
        columns={columns}
        data={filtered.slice((page - 1) * 10, page * 10)}
        total={total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        onSearch={setSearch}
        searchPlaceholder={t("Search hash or IP...", "搜索哈希或 IP...")}
      />{" "}
    </PageContainer>
  );
}
