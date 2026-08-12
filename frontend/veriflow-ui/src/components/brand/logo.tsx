import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string | undefined;
  showWordmark?: boolean | undefined;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <ShieldCheck className="size-[18px]" aria-hidden="true" />
      </span>
      {showWordmark ? (
        <span className="min-w-0">
          <span className="block truncate text-[0.9375rem] font-semibold leading-none tracking-tight text-foreground">
            Verifis
          </span>
          <span className="mt-1 block truncate text-[0.6875rem] leading-none text-muted-foreground">
            Certificate Verification
          </span>
        </span>
      ) : null}
    </span>
  );
}
