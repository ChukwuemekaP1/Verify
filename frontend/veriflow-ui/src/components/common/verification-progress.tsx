import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  FileSearch,
  Loader2,
  ScanSearch,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type VerificationStage =
  | "initializing"
  | "validating"
  | "searching"
  | "resolving"
  | "checking"
  | "complete";

export type VerificationStageStatus = "pending" | "processing" | "success" | "failed";

interface StageConfig {
  label: string;
  icon: typeof Circle;
}

const STAGES: Record<VerificationStage, StageConfig> = {
  initializing: { label: "Initializing verification", icon: Loader2 },
  validating: { label: "Validating identifier", icon: ScanSearch },
  searching: { label: "Searching verification registry", icon: Search },
  resolving: { label: "Resolving certificate", icon: FileSearch },
  checking: { label: "Validating credential status", icon: ShieldCheck },
  complete: { label: "Verification complete", icon: CheckCircle2 },
};

const STAGE_ORDER: VerificationStage[] = [
  "initializing",
  "validating",
  "searching",
  "resolving",
  "checking",
  "complete",
];

export interface VerificationProgressProps {
  /** Current active stage */
  currentStage: VerificationStage;
  /** Whether the overall verification succeeded */
  success?: boolean;
  /** Whether the verification is still in progress */
  loading?: boolean;
  /** Optional: which stages completed successfully (for post-hoc rendering) */
  completedStages?: VerificationStage[];
  /** Optional: which stage failed (for post-hoc rendering) */
  failedStage?: VerificationStage;
  /** Variant: inline (compact) or full (card-like) */
  variant?: "inline" | "full";
  className?: string;
}

function getStageStatus(
  stage: VerificationStage,
  currentStage: VerificationStage,
  loading: boolean,
  success?: boolean,
  completedStages?: VerificationStage[],
  failedStage?: VerificationStage,
): VerificationStageStatus {
  // Post-hoc rendering (not loading)
  if (!loading) {
    if (failedStage) {
      const failedIdx = STAGE_ORDER.indexOf(failedStage);
      const stageIdx = STAGE_ORDER.indexOf(stage);
      if (stageIdx < failedIdx) return "success";
      if (stageIdx === failedIdx) return "failed";
      return "pending";
    }
    if (completedStages) {
      return completedStages.includes(stage) ? "success" : "pending";
    }
    // Default: all stages up to current are success
    const currentIdx = STAGE_ORDER.indexOf(currentStage);
    const stageIdx = STAGE_ORDER.indexOf(stage);
    if (stageIdx < currentIdx) return "success";
    if (stageIdx === currentIdx) return success ? "success" : "failed";
    return "pending";
  }

  // Live rendering (loading)
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const stageIdx = STAGE_ORDER.indexOf(stage);
  if (stageIdx < currentIdx) return "success";
  if (stageIdx === currentIdx) return "processing";
  return "pending";
}

export function VerificationProgress({
  currentStage,
  success,
  loading = true,
  completedStages,
  failedStage,
  variant = "full",
  className,
}: VerificationProgressProps) {
  const [visibleStages, setVisibleStages] = useState<VerificationStage[]>([
    "initializing",
  ]);

  useEffect(() => {
    if (!loading) {
      // Show all stages when done
      setVisibleStages(STAGE_ORDER);
      return;
    }
    // Progressively reveal stages up to current
    const currentIdx = STAGE_ORDER.indexOf(currentStage);
    const stages = STAGE_ORDER.slice(0, currentIdx + 1);
    setVisibleStages(stages);
  }, [currentStage, loading]);

  const isFull = variant === "full";

  return (
    <div
      className={cn(
        "space-y-3",
        isFull && "rounded-lg border border-border bg-card p-5",
        className,
      )}
    >
      {isFull && (
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {loading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : success ? (
            <CheckCircle2 className="size-4 text-success" />
          ) : (
            <XCircle className="size-4 text-destructive" />
          )}
          <span>{loading ? "Verifying credential..." : success ? "Verification complete" : "Verification unsuccessful"}</span>
        </div>
      )}

      <div className={cn("space-y-0", isFull && "mt-4")}>
        {visibleStages.map((stage, idx) => {
          const status = getStageStatus(
            stage,
            currentStage,
            loading,
            success,
            completedStages,
            failedStage,
          );
          const config = STAGES[stage];
          const Icon = config.icon;
          const isLast = idx === visibleStages.length - 1;

          return (
            <div key={stage} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border transition-all duration-300",
                    status === "success" && "border-success/30 bg-success-subtle text-success",
                    status === "processing" && "border-primary/30 bg-primary-subtle text-primary",
                    status === "failed" && "border-destructive/30 bg-destructive-subtle text-destructive",
                    status === "pending" && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {status === "processing" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : status === "success" ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : status === "failed" ? (
                    <XCircle className="size-3.5" />
                  ) : (
                    <Circle className="size-3.5" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "h-4 w-px transition-colors duration-300",
                      status === "success" ? "bg-success/30" : "bg-border",
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-sm transition-colors duration-300",
                    status === "success" && "text-foreground",
                    status === "processing" && "font-medium text-foreground",
                    status === "failed" && "text-destructive",
                    status === "pending" && "text-muted-foreground",
                  )}
                >
                  {config.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Document verification progress — extends the base with document-specific stages.
 */
export type DocumentStage =
  | "receiving"
  | "analysing"
  | "extracting"
  | "detecting"
  | "looking_up"
  | "matching"
  | "complete";

const DOC_STAGES: Record<DocumentStage, StageConfig> = {
  receiving: { label: "Document received", icon: Circle },
  analysing: { label: "Document analysis", icon: FileSearch },
  extracting: { label: "OCR extraction", icon: ScanSearch },
  detecting: { label: "Identifier detection", icon: Search },
  looking_up: { label: "Registry lookup", icon: ShieldCheck },
  matching: { label: "Credential match", icon: CheckCircle2 },
  complete: { label: "Verification complete", icon: CheckCircle2 },
};

const DOC_STAGE_ORDER: DocumentStage[] = [
  "receiving",
  "analysing",
  "extracting",
  "detecting",
  "looking_up",
  "matching",
  "complete",
];

export interface DocumentVerificationProgressProps {
  currentStage: DocumentStage;
  success?: boolean;
  loading?: boolean;
  failedStage?: DocumentStage;
  className?: string;
}

function getDocStageStatus(
  stage: DocumentStage,
  currentStage: DocumentStage,
  loading: boolean,
  success?: boolean,
  failedStage?: DocumentStage,
): VerificationStageStatus {
  if (!loading) {
    if (failedStage) {
      const failedIdx = DOC_STAGE_ORDER.indexOf(failedStage);
      const stageIdx = DOC_STAGE_ORDER.indexOf(stage);
      if (stageIdx < failedIdx) return "success";
      if (stageIdx === failedIdx) return "failed";
      return "pending";
    }
    const currentIdx = DOC_STAGE_ORDER.indexOf(currentStage);
    const stageIdx = DOC_STAGE_ORDER.indexOf(stage);
    if (stageIdx < currentIdx) return "success";
    if (stageIdx === currentIdx) return success ? "success" : "failed";
    return "pending";
  }

  const currentIdx = DOC_STAGE_ORDER.indexOf(currentStage);
  const stageIdx = DOC_STAGE_ORDER.indexOf(stage);
  if (stageIdx < currentIdx) return "success";
  if (stageIdx === currentIdx) return "processing";
  return "pending";
}

export function DocumentVerificationProgress({
  currentStage,
  success,
  loading = true,
  failedStage,
  className,
}: DocumentVerificationProgressProps) {
  const [visibleStages, setVisibleStages] = useState<DocumentStage[]>([
    "receiving",
  ]);

  useEffect(() => {
    if (!loading) {
      setVisibleStages(DOC_STAGE_ORDER);
      return;
    }
    const currentIdx = DOC_STAGE_ORDER.indexOf(currentStage);
    const stages = DOC_STAGE_ORDER.slice(0, currentIdx + 1);
    setVisibleStages(stages);
  }, [currentStage, loading]);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 space-y-3",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : success ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : (
          <XCircle className="size-4 text-destructive" />
        )}
        <span>
          {loading
            ? "Processing document..."
            : success
              ? "Document verified"
              : "Document verification unsuccessful"}
        </span>
      </div>

      <div className="mt-4 space-y-0">
        {visibleStages.map((stage, idx) => {
          const status = getDocStageStatus(
            stage,
            currentStage,
            loading,
            success,
            failedStage,
          );
          const config = DOC_STAGES[stage];
          const isLast = idx === visibleStages.length - 1;

          return (
            <div key={stage} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border transition-all duration-300",
                    status === "success" && "border-success/30 bg-success-subtle text-success",
                    status === "processing" && "border-primary/30 bg-primary-subtle text-primary",
                    status === "failed" && "border-destructive/30 bg-destructive-subtle text-destructive",
                    status === "pending" && "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {status === "processing" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : status === "success" ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : status === "failed" ? (
                    <XCircle className="size-3.5" />
                  ) : (
                    <Circle className="size-3.5" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "h-4 w-px transition-colors duration-300",
                      status === "success" ? "bg-success/30" : "bg-border",
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-sm transition-colors duration-300",
                    status === "success" && "text-foreground",
                    status === "processing" && "font-medium text-foreground",
                    status === "failed" && "text-destructive",
                    status === "pending" && "text-muted-foreground",
                  )}
                >
                  {config.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
