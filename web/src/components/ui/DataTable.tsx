import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Inbox, Loader2, Rows3, Search, X } from "lucide-react";
import { useLang } from "../../lib/LanguageContext";
import { useTableCompactMode } from "../../lib/useTableCompactMode";

export interface Column<T> {
  key: string;
  title: string;
  render?: (record: T) => React.ReactNode;
}

export interface BatchAction {
  key: string;
  label: string;
  variant?: "default" | "danger";
  disabled?: boolean;
  onClick: (selectedIds: Array<string | number>) => void | Promise<void>;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  filterNodes?: React.ReactNode;
  selectedIds?: Array<string | number>;
  onSelectionChange?: (ids: Array<string | number>) => void;
  batchActions?: BatchAction[];
  rowKey?: (record: T) => string | number;
  expandedIds?: Set<string | number>;
  renderExpandedRow?: (record: T) => React.ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
  isLoading?: boolean;
  tableKey?: string;
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  searchPlaceholder,
  onSearch,
  filterNodes,
  selectedIds = [],
  onSelectionChange,
  batchActions,
  rowKey = (record: any) => record.id,
  expandedIds = new Set(),
  renderExpandedRow,
  emptyTitle,
  emptyHint,
  isLoading = false,
  tableKey,
}: DataTableProps<T>) {
  const { t } = useLang();
  const totalPages = Math.ceil(total / pageSize) || 1;
  const selectable = Boolean(onSelectionChange);
  const ids = useMemo(
    () => data.map((row) => (rowKey ? rowKey(row) : (row as T & { id?: string | number }).id ?? "")),
    [data, rowKey],
  );
  const idSet = useMemo(() => new Set(ids), [ids]);
  const selectedOnPage = useMemo(
    () => (selectedIds ?? []).filter((value) => idSet.has(value)),
    [selectedIds, idSet],
  );
  const allOnPageSelected =
    selectable && ids.length > 0 && selectedOnPage.length === ids.length;
  const partialSelected =
    selectable && selectedOnPage.length > 0 && !allOnPageSelected;
  const totalSelected = (selectedIds ?? []).length;
  const densityKey = tableKey ?? columns.map((column) => column.key).join("|");
  const [compact, setCompact] = useTableCompactMode(densityKey);

  // --- Local search state with debounce so typing doesn't refetch on every keypress
  const [searchValue, setSearchValue] = useState("");
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!onSearch) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onSearch(searchValue);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchValue, onSearch]);

  const clearSearch = useCallback(() => {
    setSearchValue("");
    onSearch?.("");
  }, [onSearch]);

  const hasActiveSearch = searchValue.trim().length > 0;

  const toggleRow = useCallback(
    (id: string | number) => {
      if (!onSelectionChange) return;
      const current = new Set(selectedIds ?? []);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      onSelectionChange(Array.from(current));
    },
    [onSelectionChange, selectedIds],
  );

  const toggleAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allOnPageSelected) {
      const remaining = (selectedIds ?? []).filter((id) => !idSet.has(id));
      onSelectionChange(remaining);
    } else {
      const merged = new Set(selectedIds ?? []);
      for (const id of ids) merged.add(id);
      onSelectionChange(Array.from(merged));
    }
  }, [onSelectionChange, allOnPageSelected, ids, idSet, selectedIds]);

  const selectionColumn: Column<T> = {
    key: "__select",
    title: "",
    render: (record: T) => {
      const id = rowKey ? rowKey(record) : (record as T & { id?: string | number }).id ?? "";
      const checked = (selectedIds ?? []).includes(id);
      return (
        <input
          type="checkbox"
          aria-label="select row"
          checked={checked}
          onChange={() => toggleRow(id)}
          onClick={(event) => event.stopPropagation()}
          className="h-4 w-4 cursor-pointer accent-ink"
        />
      );
    },
  };

  const renderedColumns = selectable ? [selectionColumn, ...columns] : columns;

  const headerSelectCell = selectable ? (
    <th className={`w-10 whitespace-nowrap px-4 ${compact ? "py-2" : "py-3"}`}>
      <input
        type="checkbox"
        aria-label="select all"
        checked={allOnPageSelected}
        ref={(node) => {
          if (node) node.indeterminate = partialSelected;
        }}
        onChange={toggleAll}
        className="h-4 w-4 cursor-pointer accent-ink"
      />
    </th>
  ) : null;

  return (
    <div className="data-table-shell ui-panel admin-surface flex min-h-0 flex-col overflow-hidden rounded-lg">
      <div className="flex flex-col items-start justify-between gap-3 border-b border-ink/10 bg-white p-3 sm:flex-row sm:items-center">
        <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto">
          {onSearch && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && searchValue) {
                    event.preventDefault();
                    clearSearch();
                  }
                }}
                placeholder={searchPlaceholder || t("Search...", "搜索...")}
                aria-label={searchPlaceholder || t("Search", "搜索")}
                className="w-full rounded-none border-b border-ink/10 bg-transparent py-2 pl-9 pr-8 font-sans text-body text-ink outline-none transition-colors placeholder:text-ink/30 focus:border-ink"
              />
              {hasActiveSearch && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label={t("Clear search", "清空搜索")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>
          )}
          {!onSearch ? <span className="text-caption text-muted">{total.toLocaleString()} {t("records", "条记录")}</span> : null}
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {filterNodes && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-none">{filterNodes}</div>
          )}
          <button type="button" aria-pressed={compact} onClick={() => setCompact(!compact)} title={t("Toggle compact rows", "切换紧凑行")} className={`icon-btn h-8 w-8 shrink-0 rounded-md border ${compact ? "border-ink bg-ink text-paper" : "border-ink/15"}`}>
            <Rows3 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {selectable && batchActions && batchActions.length > 0 && totalSelected > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-ink/10 bg-secondary px-4 py-3 text-caption font-mono">
          <span className="text-caption uppercase tracking-widest text-muted">
            {t(`${totalSelected} selected`, `已选 ${totalSelected} 项`)}
          </span>
          <div className="flex flex-wrap gap-2">
            {batchActions.map((action) => (
              <button
                key={action.key}
                type="button"
                disabled={action.disabled}
                onClick={() => void action.onClick(selectedIds ?? [])}
                className={`border px-3 py-1.5 text-caption uppercase tracking-widest transition-colors disabled:opacity-50 ${
                  action.variant === "danger"
                    ? "border-red-900/30 text-red-700 hover:border-red-700"
                    : "border-ink/20 text-ink hover:border-ink"
                }`}
              >
                {action.label}
              </button>
            ))}
            {onSelectionChange && (
              <button
                type="button"
                onClick={() => onSelectionChange([])}
                className="border border-ink/10 px-3 py-1.5 text-caption uppercase tracking-widest text-muted transition-colors hover:border-ink/30"
              >
                {t("Clear", "清空")}
              </button>
            )}
          </div>
        </div>
      )}
      <div className="relative min-h-[300px] min-w-0 w-full bg-transparent">
        {isLoading ? (
          <TableSkeleton columns={columns.length + (selectable ? 1 : 0)} rows={pageSize} />
        ) : data.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center text-muted">
            <Inbox className="mb-4 h-8 w-8 stroke-[1.5] opacity-30" />
            <p className="text-caption font-mono uppercase tracking-widest">
              {emptyTitle ?? (hasActiveSearch
                ? t("No matching records", "无匹配记录")
                : t("No Records Found", "未找到记录"))}
            </p>
            {hasActiveSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="mt-3 border-b border-ink/30 font-mono text-overline uppercase tracking-widest text-ink transition-colors hover:border-ink"
              >
                {t("Clear search to see all", "清空搜索查看全部")}
              </button>
            )}
            {!hasActiveSearch && emptyHint && (
              <p className="mt-2 max-w-xs text-caption text-muted/70">{emptyHint}</p>
            )}
          </div>
        ) : (
          <>
            <div className="hidden min-h-[300px] w-full overflow-x-auto no-scrollbar md:block">
              <table className="relative w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink/10 bg-secondary/70">
                    {headerSelectCell}
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={`whitespace-nowrap px-4 ${compact ? "py-2" : "py-3"} text-caption font-medium uppercase tracking-widest text-muted ${column.key === "actions" ? "sticky right-0 z-10 border-l border-ink/10 bg-secondary shadow-[-8px_0_12px_rgba(18,17,16,0.04)]" : ""}`}
                      >
                        {column.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {data.map((record) => {
                    const id = rowKey ? rowKey(record) : (record as T & { id?: string | number }).id ?? "";
                    const isSelected = (selectedIds ?? []).includes(id);
                    return (
                      <React.Fragment key={id}>
                      <tr
                        className={`group relative z-0 transition-colors duration-200 hover:bg-paper/50 ${
                          isSelected ? "bg-paper" : ""
                        }`}
                      >
                        {selectable && (
                            <td className={`whitespace-nowrap px-4 ${compact ? "py-2" : "py-3"}`}>
                            <input
                              type="checkbox"
                              aria-label="select row"
                              checked={isSelected}
                              onChange={() => toggleRow(id)}
                              onClick={(event) => event.stopPropagation()}
                              className="h-4 w-4 cursor-pointer accent-ink"
                            />
                          </td>
                        )}
                        {columns.map((column) => (
                          <td
                            key={column.key}
                            className={`whitespace-nowrap px-4 ${compact ? "py-2" : "py-3"} font-sans text-caption text-ink transition-colors duration-200 ${column.key === "actions" ? "sticky right-0 z-10 border-l border-ink/10 bg-white shadow-[-8px_0_12px_rgba(18,17,16,0.04)] group-hover:bg-secondary" : ""}`}
                          >
                            {column.render
                              ? column.render(record)
                              : String((record as Record<string, unknown>)[column.key] ?? "")}
                          </td>
                        ))}
                      </tr>
                      {expandedIds && expandedIds.size > 0 && renderExpandedRow && expandedIds.has(id) && (
                        <tr>
                          <td
                            colSpan={columns.length + (selectable ? 1 : 0)}
                            className="border-t border-ink/10 bg-paper/50 px-6 py-4"
                          >
                            {renderExpandedRow(record)}
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="block min-h-[300px] divide-y divide-ink/5 md:hidden">
              {data.map((record) => {
                const id = rowKey ? rowKey(record) : (record as T & { id?: string | number }).id ?? "";
                const isSelected = (selectedIds ?? []).includes(id);
                return (
                  <React.Fragment key={id}>
                  <div
                    className={`flex flex-col ${compact ? "gap-1.5 p-2.5" : "gap-2.5 p-3"} transition-colors duration-200 hover:bg-paper/50 ${
                      isSelected ? "bg-paper" : ""
                    }`}
                  >
                    {selectable && (
                      <label className="flex items-center gap-2 text-overline font-mono uppercase tracking-widest text-muted">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          className="h-4 w-4 accent-ink"
                        />
                        {t("Select", "选择")}
                      </label>
                    )}
                    {columns.map((column, index) => (
                      <div
                        key={column.key}
                        className={`flex items-center justify-between ${index === 0 ? "mb-2 border-b border-ink/5 pb-2" : ""}`}
                      >
                        <span className="mr-4 shrink-0 text-caption font-mono uppercase tracking-[0.1em] text-muted/70">
                          {column.title}
                        </span>
                        <div className="overflow-hidden break-words text-right text-body text-ink">
                          {column.render
                            ? column.render(record)
                            : String((record as Record<string, unknown>)[column.key] ?? "")}
                        </div>
                      </div>
                    ))}
                  </div>
                  {expandedIds && expandedIds.size > 0 && renderExpandedRow && expandedIds.has(id) && (
                    <div className="border-t border-ink/10 bg-paper/50 px-4 py-4">
                      {renderExpandedRow(record)}
                    </div>
                  )}
                  </React.Fragment>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className="flex flex-col items-center justify-between gap-4 border-t border-ink/10 bg-paper p-4 sm:flex-row">
        <span className="text-overline font-mono uppercase tracking-widest text-muted">
          {t("Showing", "显示")} {total === 0 ? 0 : (page - 1) * pageSize + 1}—{Math.min(page * pageSize, total)}{" "}
          {t("of", "共")} {total} {t("records", "条记录")}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            aria-label={t("Previous page", "上一页")}
            className="flex h-8 w-8 items-center justify-center rounded-none border border-ink/10 transition-colors hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4 stroke-[1.5]" />
          </button>
          <div className="px-4 text-overline font-mono tracking-widest text-ink">
            {page} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            aria-label={t("Next page", "下一页")}
            className="flex h-8 w-8 items-center justify-center rounded-none border border-ink/10 transition-colors hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4 stroke-[1.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  // Deterministic widths so re-renders don't cause the skeleton to jump.
  const widthAt = (row: number, col: number) =>
    `${40 + ((row * 31 + col * 17) % 40)}%`;

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-muted opacity-40" />
      <span className="font-mono text-overline uppercase tracking-widest text-muted opacity-40">
        Loading...
      </span>
      <div className="mt-4 w-full overflow-x-auto no-scrollbar md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-ink/10">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-5">
                  <div className="h-3 w-16 animate-pulse rounded-sm bg-ink/10" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx} className="px-6 py-5">
                    <div
                      className="h-3 animate-pulse rounded-sm bg-ink/10"
                      style={{ width: widthAt(rowIdx, colIdx) }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
