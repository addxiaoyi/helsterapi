import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type Props = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
};

export function TitledCard({
  title,
  description,
  icon,
  action,
  children,
  className,
  headerClassName,
  contentClassName,
}: Props) {
  return (
    <section className={cn("ui-panel overflow-hidden", className)}>
      <header className={cn("ui-panel-header", headerClassName)}>
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink/5 text-ink">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-label font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-caption text-muted">{description}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children ? <div className={cn("p-3 sm:p-4", contentClassName)}>{children}</div> : null}
    </section>
  );
}
