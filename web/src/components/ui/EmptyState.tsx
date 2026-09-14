import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "compact";
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        variant === "default" ? "py-16" : "py-8",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 flex items-center justify-center border border-ink/10 bg-paper",
          variant === "default" ? "h-12 w-12" : "h-9 w-9",
        )}
      >
        <Icon
          className={cn(
            "stroke-[1.5] text-muted",
            variant === "default" ? "h-5 w-5" : "h-4 w-4",
          )}
        />
      </div>
      <h3
        className={cn(
          "font-serif text-ink",
          variant === "default" ? "text-lg" : "text-base",
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "mt-2 max-w-sm text-muted",
            variant === "default" ? "text-body" : "text-caption",
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
