import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  footer?: ReactNode | undefined;
  children: ReactNode;
  bodyClassName?: string | undefined;
  className?: string | undefined;
}

export function SectionCard({
  title,
  description,
  actions,
  footer,
  children,
  bodyClassName,
  className,
}: SectionCardProps) {
  return (
    <section className={cn("surface-panel overflow-hidden", className)}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
      {footer ? <div className="border-t border-border px-4 py-3 sm:px-5">{footer}</div> : null}
    </section>
  );
}
