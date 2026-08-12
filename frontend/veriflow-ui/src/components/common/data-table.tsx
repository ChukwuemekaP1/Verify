import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { TableSkeleton } from "@/components/common/skeletons";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface DataTableColumn {
  id: string;
  header: string;
  align?: "left" | "right" | undefined;
  className?: string | undefined;
}

interface DataTableProps {
  columns: DataTableColumn[];
  caption?: string | undefined;
  /** Rendered rows. Data is supplied by the backend at integration time. */
  children?: ReactNode | undefined;
  isLoading?: boolean | undefined;
  isError?: boolean | undefined;
  isEmpty?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  emptyTitle?: string | undefined;
  emptyDescription?: string | undefined;
  emptyAction?: ReactNode | undefined;
  toolbar?: ReactNode | undefined;
  footer?: ReactNode | undefined;
  className?: string | undefined;
}

export function DataTable({
  columns,
  caption,
  children,
  isLoading = false,
  isError = false,
  isEmpty = false,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Records will appear once data is available.",
  emptyAction,
  toolbar,
  footer,
  className,
}: DataTableProps) {
  const showBody = !isLoading && !isError && !isEmpty;

  return (
    <section className={cn("surface-panel overflow-hidden", className)}>
      {toolbar}

      <div className="overflow-x-auto">
        <Table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <TableHeader>
            <TableRow className="bg-surface hover:bg-surface">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  scope="col"
                  className={cn(
                    "h-10 whitespace-nowrap text-xs font-medium text-muted-foreground",
                    column.align === "right" && "text-right",
                    column.className,
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {showBody ? <TableBody>{children}</TableBody> : null}
        </Table>
      </div>

      {isLoading ? <TableSkeleton columns={columns.length} /> : null}
      {!isLoading && isError ? <ErrorState onRetry={onRetry} /> : null}
      {!isLoading && !isError && isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : null}

      {footer}
    </section>
  );
}
