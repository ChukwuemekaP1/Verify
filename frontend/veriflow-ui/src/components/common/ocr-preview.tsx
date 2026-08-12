import { ScanLine } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface OcrPreviewProps {
  /** Source document preview URL provided by the backend. */
  documentUrl?: string | undefined;
  /** Raw extracted text returned by the OCR service. */
  extractedText?: string | undefined;
  /** Model confidence 0–1, rendered as a percentage badge. */
  confidence?: number | undefined;
  loading?: boolean | undefined;
  actions?: ReactNode | undefined;
  className?: string | undefined;
}

function confidenceVariant(confidence: number) {
  if (confidence >= 0.9) return "success" as const;
  if (confidence >= 0.7) return "warning" as const;
  return "danger" as const;
}

export function OcrPreview({
  documentUrl,
  extractedText,
  confidence,
  loading = false,
  actions,
  className,
}: OcrPreviewProps) {
  return (
    <section className={cn("surface-panel overflow-hidden", className)}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ScanLine className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <h3 className="truncate text-sm font-semibold text-foreground">Document extraction</h3>
          {typeof confidence === "number" ? (
            <Badge variant={confidenceVariant(confidence)}>
              {Math.round(confidence * 100)}% confidence
            </Badge>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>

      <div className="grid gap-px bg-border md:grid-cols-2">
        <div className="bg-surface p-4">
          <p className="text-eyebrow mb-3 text-muted-foreground">Source</p>
          <div className="grid aspect-[3/4] place-items-center overflow-hidden rounded-md border border-border bg-card">
            {loading ? (
              <Skeleton className="size-full rounded-none" />
            ) : documentUrl ? (
              <img
                src={documentUrl}
                alt="Uploaded certificate preview"
                loading="lazy"
                className="size-full object-contain"
              />
            ) : (
              <EmptyState
                title="No document"
                description="Upload a certificate to preview it here."
                className="py-8"
              />
            )}
          </div>
        </div>

        <div className="bg-card p-4">
          <p className="text-eyebrow mb-3 text-muted-foreground">Extracted text</p>
          <ScrollArea className="h-[calc(100%-1.75rem)] max-h-[28rem] rounded-md border border-border bg-surface">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-3 w-full" />
                ))}
              </div>
            ) : extractedText ? (
              <pre className="whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-foreground">
                {extractedText}
              </pre>
            ) : (
              <EmptyState
                title="Nothing extracted yet"
                description="OCR output will appear here once processing completes."
                className="py-8"
              />
            )}
          </ScrollArea>
        </div>
      </div>
    </section>
  );
}
