import { Badge } from "./Badge";

export function StatusBadge({ enabled, label }: { enabled: boolean; label?: string }) {
  return <Badge variant={enabled ? "success" : "secondary"}>{label ?? (enabled ? "Enabled" : "Disabled")}</Badge>;
}

export function GroupBadge({ name, ratio, onClick }: { name: string; ratio?: number | string; onClick?: () => void }) {
  const badge = <Badge variant="outline"><span>{name || "default"}</span>{ratio !== undefined && <span className="ml-1 text-muted">×{ratio}</span>}</Badge>;
  return onClick ? <button type="button" onClick={onClick} className="cursor-pointer text-left hover:opacity-75" title="Change group">{badge}</button> : badge;
}

export function ModelBadge({ name }: { name: string }) {
  return <Badge variant="secondary" className="max-w-full truncate" title={name}>{name}</Badge>;
}
