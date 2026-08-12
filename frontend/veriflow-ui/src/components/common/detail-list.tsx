import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DetailItem {
  label: string;
  /** Populated from API data at integration time. */
  value?: ReactNode | undefined;
  mono?: boolean | undefined;
}

export function DetailList({
  items,
  loading,
  columns = 2,
  className,
}: {
  items: DetailItem[];
  loading?: boolean | undefined;
  columns?: 1 | 2 | 3 | undefined;
  className?: string | undefined;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "mt-1 truncate text-sm text-foreground",
              item.mono && "font-mono text-[0.8125rem]",
            )}
          >
            {loading ? <Skeleton className="h-4 w-28" /> : (item.value ?? "—")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
