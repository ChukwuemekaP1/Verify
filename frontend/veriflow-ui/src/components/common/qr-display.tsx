import { Copy, Download, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface QrDisplayProps {
  /** Data URL or image URL returned by the backend. */
  src?: string | undefined;
  /** Human readable verification reference rendered under the code. */
  reference?: string | undefined;
  loading?: boolean | undefined;
  onCopy?: (() => void) | undefined;
  onDownload?: (() => void) | undefined;
  className?: string | undefined;
}

export function QrDisplay({
  src,
  reference,
  loading = false,
  onCopy,
  onDownload,
  className,
}: QrDisplayProps) {
  return (
    <div className={cn("surface-panel flex flex-col items-center p-6", className)}>
      <div className="grid size-44 place-items-center overflow-hidden rounded-md border border-border bg-surface">
        {loading ? (
          <Skeleton className="size-full rounded-none" />
        ) : src ? (
          <img src={src} alt="Verification QR code" className="size-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <QrCode className="size-6" aria-hidden="true" />
            <span className="text-xs">Awaiting code</span>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Verification reference</p>
      <p className="mt-1 font-mono text-sm text-foreground">
        {loading ? <Skeleton className="h-4 w-32" /> : (reference ?? "—")}
      </p>

      <div className="mt-5 flex w-full flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onCopy} disabled={!reference}>
          <Copy aria-hidden="true" />
          Copy link
        </Button>
        <Button variant="outline" size="sm" onClick={onDownload} disabled={!src}>
          <Download aria-hidden="true" />
          Download
        </Button>
      </div>
    </div>
  );
}
