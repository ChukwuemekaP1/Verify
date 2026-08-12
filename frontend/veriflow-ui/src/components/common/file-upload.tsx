import { FileText, Trash2, UploadCloud } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  label?: string | undefined;
  hint?: string | undefined;
  accept?: string | undefined;
  multiple?: boolean | undefined;
  maxSizeMb?: number | undefined;
  /** Progress 0–100 supplied by the caller while an upload is in flight. */
  progress?: number | undefined;
  error?: string | undefined;
  onFilesSelected?: ((files: File[]) => void) | undefined;
  className?: string | undefined;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  label = "Upload document",
  hint = "PDF, PNG or JPG",
  accept = ".pdf,.png,.jpg,.jpeg",
  multiple = false,
  maxSizeMb = 10,
  progress,
  error,
  onFilesSelected,
  className,
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const accept_ = accept;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const next = Array.from(fileList);
    setFiles(multiple ? [...files, ...next] : next.slice(0, 1));
    onFilesSelected?.(next);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-9 text-center transition-colors",
          dragging && "border-primary bg-accent",
          error && "border-destructive",
        )}
      >
        <span className="mb-3 grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground">
          <UploadCloud className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="mt-1 text-xs text-muted-foreground">
          Drag and drop, or click to browse · {hint} · up to {maxSizeMb} MB
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={accept_}
          multiple={multiple}
          onChange={(event) => handleFiles(event.target.files)}
        />
      </label>

      {typeof progress === "number" ? (
        <div className="space-y-1.5">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">Uploading… {Math.round(progress)}%</p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{file.name}</span>
                <span className="block text-xs text-muted-foreground">{formatSize(file.size)}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${file.name}`}
                onClick={() => removeFile(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
