import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDefinition {
  id: string;
  label: string;
  options: FilterOption[];
  value?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
}

interface FilterBarProps {
  filters: FilterDefinition[];
  onReset?: (() => void) | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
}

export function FilterBar({ filters, onReset, children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        Filters
      </span>

      {filters.map((filter) => (
        <Select
          key={filter.id}
          {...(filter.value !== undefined ? { value: filter.value } : {})}
          {...(filter.onChange ? { onValueChange: filter.onChange } : {})}
        >
          <SelectTrigger className="h-9 w-full sm:w-[180px]" aria-label={filter.label}>
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {children}

      {onReset ? (
        <Button variant="ghost" size="sm" className="sm:ml-auto" onClick={onReset}>
          Reset
        </Button>
      ) : null}
    </div>
  );
}
