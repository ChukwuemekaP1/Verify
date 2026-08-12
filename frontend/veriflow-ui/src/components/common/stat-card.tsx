import type { LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  /** Supplied by the backend at integration time. */
  value?: string | number | undefined;
  hint?: string | undefined;
  icon?: LucideIcon | undefined;
  loading?: boolean | undefined;
  className?: string | undefined;
}

export function StatCard({ label, value, hint, icon: Icon, loading, className }: StatCardProps) {
  return (
    <div className={cn("surface-panel p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-eyebrow text-muted-foreground">{label}</p>
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
      </div>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value ?? "—"}</p>
        )}
      </div>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
