import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useTableUrlState() {
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = params.get("q") ?? "";

  const update = useCallback((patch: { page?: number; search?: string }) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (patch.page !== undefined) {
        if (patch.page <= 1) next.delete("page");
        else next.set("page", String(patch.page));
      }
      if (patch.search !== undefined) {
        const value = patch.search.trim();
        if (value) next.set("q", value);
        else next.delete("q");
      }
      return next;
    }, { replace: true });
  }, [setParams]);

  const setPage = useCallback((value: number) => update({ page: value }), [update]);
  const setSearch = useCallback((value: string) => update({ page: 1, search: value }), [update]);

  return { page, search, setPage, setSearch };
}
