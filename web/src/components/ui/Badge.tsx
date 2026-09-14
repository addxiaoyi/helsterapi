import * as React from "react";
import { cn } from "@/src/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "secondary" | "outline" | "destructive" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-none border px-2 py-0.5 text-caption font-mono transition-colors",
        {
          "border-ink bg-ink text-paper": variant === "default",
          "border-emerald-200/60 bg-emerald-50 text-emerald-700": variant === "success",
          "border-rule bg-rule-soft text-muted": variant === "secondary",
          "border-rule bg-transparent text-muted": variant === "outline",
          "border-rose-200/60 bg-rose-50 text-rose-700": variant === "destructive",
          "border-amber-200/60 bg-amber-50 text-amber-700": variant === "warning",
        },
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
