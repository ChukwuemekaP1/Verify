import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationBarProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  summary?: string | undefined;
  className?: string | undefined;
}

export function PaginationBar({
  page,
  pageCount,
  onPageChange,
  summary,
  className,
}: PaginationBarProps) {
  const canPrev = page > 1;
  const canNext = page < pageCount;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3",
        className,
      )}
    >
      <p className="min-w-0 truncate text-xs text-muted-foreground">
        {summary ?? `Page ${page} of ${Math.max(pageCount, 1)}`}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
