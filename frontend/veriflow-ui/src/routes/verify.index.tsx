import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { BadgeCheck, QrCode, ShieldCheck, Upload as UploadIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FileUpload } from "@/components/common/file-upload";
import { FormField } from "@/components/common/form-field";
import { SectionCard } from "@/components/common/section-card";
import {
  VerificationProgress,
  DocumentVerificationProgress,
  type VerificationStage,
  type DocumentStage,
} from "@/components/common/verification-progress";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { api } from "@/lib/api";
import type { ApiError } from "@/lib/api/http-client";
import { toast } from "sonner";

export const Route = createFileRoute("/verify/")({
  component: PublicVerifyPage,
  head: () => ({
    meta: [
      { title: "Verify a certificate — Verifis" },
      {
        name: "description",
        content:
          "Confirm the authenticity of an academic certificate using its number, an uploaded copy, or its QR code.",
      },
      { property: "og:title", content: "Verify a certificate — Verifis" },
      {
        property: "og:description",
        content: "Public certificate verification by number, document upload or QR code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/** Simulate stage progression during an API call. */
function useStageProgress(stages: VerificationStage[], active: boolean): VerificationStage {
  const [stageIdx, setStageIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      setStageIdx(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setStageIdx(0);
    intervalRef.current = setInterval(() => {
      setStageIdx((prev) => {
        if (prev >= stages.length - 2) {
          // Hold at second-to-last stage until complete
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 400);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, stages.length]);

  return (stages[Math.min(stageIdx, stages.length - 1)] ?? stages[0]) as VerificationStage;
}

function useDocStageProgress(stages: DocumentStage[], active: boolean): DocumentStage {
  const [stageIdx, setStageIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      setStageIdx(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setStageIdx(0);
    intervalRef.current = setInterval(() => {
      setStageIdx((prev) => {
        if (prev >= stages.length - 2) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 600);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, stages.length]);

  return (stages[Math.min(stageIdx, stages.length - 1)] ?? stages[0]) as DocumentStage;
}

const VERIFY_STAGES: VerificationStage[] = [
  "initializing",
  "validating",
  "searching",
  "resolving",
  "checking",
  "complete",
];

const DOC_STAGES: DocumentStage[] = [
  "receiving",
  "analysing",
  "extracting",
  "detecting",
  "looking_up",
  "matching",
  "complete",
];

function PublicVerifyPage() {
  const router = useRouter();
  const [certificateNumber, setCertificateNumber] = useState("");
  const [surname, setSurname] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [numberLoading, setNumberLoading] = useState(false);
  const [numberError, setNumberError] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrReference, setQrReference] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const uploadFileState = useMemo(() => (uploadFile ? { file: uploadFile } : null), [uploadFile]);
  const qrFileState = useMemo(() => (qrFile ? { file: qrFile } : null), [qrFile]);

  const numberStage = useStageProgress(VERIFY_STAGES, numberLoading);
  const qrStage = useStageProgress(VERIFY_STAGES, qrLoading);
  const docStage = useDocStageProgress(DOC_STAGES, uploadLoading);

  async function handleVerifyByNumber(e: React.FormEvent) {
    e.preventDefault();
    setNumberLoading(true);
    setNumberError(null);
    try {
      const result = await api.verifications.verifyPublic(certificateNumber);
      const ref = result?.data?.certificate?.verificationReference;
      if (!ref) {
        setNumberError("Verification returned no reference. Try again.");
        return;
      }
      await router.navigate({
        to: "/verify/result",
        search: { ref, method: "number" },
      });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 404) {
        setNumberError("not_found");
      } else {
        const msg = apiErr.message || "Verification failed. Please try again.";
        setNumberError(msg);
        toast.error(msg);
      }
    } finally {
      setNumberLoading(false);
    }
  }

  async function handleVerifyByUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Select a certificate file first.");
      return;
    }
    setUploadLoading(true);
    setUploadError(null);
    try {
      const result = await api.verifications.verifyByUpload(uploadFile, {
        surname: surname || undefined,
        matricNumber: matricNumber || undefined,
      } as { surname?: string; matricNumber?: string });
      const data = result?.data;
      if (data?.verified && data.result?.certificate?.verificationReference) {
        await router.navigate({
          to: "/verify/result",
          search: { ref: data.result.certificate.verificationReference, method: "upload" },
        });
      } else {
        // Determine the failure reason for proper UX
        const reason = data?.reason;
        if (reason === "NO_TEXT" || reason === "OCR_FAILED") {
          setUploadError("ocr_failure");
        } else if (reason === "NO_IDENTIFIER") {
          setUploadError("no_identifier");
        } else if (reason === "NOT_FOUND") {
          setUploadError("not_found");
        } else if (reason === "LOW_CONFIDENCE") {
          setUploadError("low_confidence");
        } else {
          setUploadError("not_found");
        }
      }
    } catch (err) {
      const msg = (err as ApiError).message || "Verification failed. Please try again.";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleVerifyByQr(e: React.FormEvent) {
    e.preventDefault();
    if (!qrFile && !qrReference.trim()) {
      setQrError("Upload a QR image or enter a verification reference.");
      return;
    }
    setQrLoading(true);
    setQrError(null);
    try {
      const identifier = qrReference.trim();
      if (!identifier) {
        setQrError("Enter a verification reference to verify.");
        setQrLoading(false);
        return;
      }
      const result = await api.verifications.verifyPublic(identifier);
      const ref = result?.data?.certificate?.verificationReference;
      if (!ref) {
        setQrError("Verification returned no reference. Try again.");
        return;
      }
      await router.navigate({
        to: "/verify/result",
        search: { ref, method: "qr" },
      });
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 404) {
        setQrError("not_found");
      } else {
        const msg = apiErr.message || "QR verification failed. Please try again.";
        setQrError(msg);
        toast.error(msg);
      }
    } finally {
      setQrLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
        <Container className="flex h-14 items-center justify-between">
          <Link to="/" className="focus-ring rounded-md">
            <Logo />
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">Institution sign in</Link>
          </Button>
        </Container>
      </header>

      <main className="flex-1 py-10 sm:py-14">
        <Container size="narrow" className="space-y-6">
          <div className="text-center">
            <span className="text-eyebrow text-muted-foreground">Public verification</span>
            <h1 className="text-title mt-3 text-foreground">Verify an academic certificate</h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Check a credential against the issuing institution's records. Every check returns an
              auditable reference.
            </p>
          </div>

          <SectionCard title="Choose a verification method" bodyClassName="p-4 sm:p-5">
            <Tabs defaultValue="number">
              <TabsList className="w-full">
                <TabsTrigger value="number" className="flex-1">
                  Verification key
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex-1">
                  Upload document
                </TabsTrigger>
                <TabsTrigger value="qr" className="flex-1">
                  QR code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="number" className="mt-5">
                {numberLoading ? (
                  <VerificationProgress currentStage={numberStage} loading />
                ) : numberError === "not_found" ? (
                  <VerificationFailureState
                    identifier={certificateNumber}
                    method="Verification key"
                    onRetry={() => {
                      setNumberError(null);
                      setCertificateNumber("");
                    }}
                  />
                ) : (
                  <form className="space-y-5" onSubmit={handleVerifyByNumber}>
                    <FormField
                      id="certificate-number"
                      label="Verification key or certificate number"
                      hint="Enter the verification reference, certificate number, or registration number"
                      required
                      error={numberError && numberError !== "not_found" ? numberError : undefined}
                    >
                      <Input
                        id="certificate-number"
                        value={certificateNumber}
                        onChange={(event) => setCertificateNumber(event.target.value)}
                        className="font-mono"
                        placeholder="e.g. UNNV001K0L1BO or UNN-CERT-0001-2026"
                      />
                    </FormField>
                    <Button type="submit" className="w-full sm:w-auto" disabled={numberLoading || !certificateNumber.trim()}>
                      <BadgeCheck aria-hidden="true" />
                      Verify certificate
                    </Button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="upload" className="mt-5">
                {uploadLoading ? (
                  <DocumentVerificationProgress currentStage={docStage} loading />
                ) : uploadError === "ocr_failure" ? (
                  <OcrFailureState
                    onRetry={() => {
                      setUploadError(null);
                      setUploadFile(null);
                    }}
                  />
                ) : uploadError === "no_identifier" ? (
                  <NoIdentifierState
                    onRetry={() => {
                      setUploadError(null);
                      setUploadFile(null);
                    }}
                  />
                ) : uploadError === "not_found" ? (
                  <VerificationFailureState
                    identifier="Uploaded document"
                    method="Document upload"
                    onRetry={() => {
                      setUploadError(null);
                      setUploadFile(null);
                    }}
                  />
                ) : uploadError === "low_confidence" ? (
                  <LowConfidenceState
                    onRetry={() => {
                      setUploadError(null);
                      setUploadFile(null);
                    }}
                  />
                ) : (
                  <form className="space-y-5" onSubmit={handleVerifyByUpload}>
                    <FileUpload
                      label="Upload the certificate"
                      hint="PDF, PNG or JPG"
                      maxSizeMb={10}
                      onFilesSelected={(files) => setUploadFile(files[0] ?? null)}
                      controlledValue={uploadFileState}
                      error={uploadError && !["ocr_failure", "no_identifier", "not_found", "low_confidence"].includes(uploadError) ? uploadError : undefined}
                    />
                    <Button type="submit" className="w-full sm:w-auto" disabled={uploadLoading || !uploadFile}>
                      <UploadIcon aria-hidden="true" />
                      Verify certificate
                    </Button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="qr" className="mt-5">
                {qrLoading ? (
                  <VerificationProgress currentStage={qrStage} loading />
                ) : qrError === "not_found" ? (
                  <VerificationFailureState
                    identifier={qrReference}
                    method="QR code"
                    onRetry={() => {
                      setQrError(null);
                      setQrReference("");
                      setQrFile(null);
                    }}
                  />
                ) : (
                  <form className="space-y-5" onSubmit={handleVerifyByQr}>
                    <FormField
                      id="qr-reference"
                      label="Verification reference"
                      hint="Enter the reference from the QR code or printed on the certificate"
                    >
                      <Input
                        id="qr-reference"
                        className="font-mono"
                        value={qrReference}
                        onChange={(e) => setQrReference(e.target.value)}
                        placeholder="e.g. UNNV001K0L1BO"
                      />
                    </FormField>
                    <Button type="submit" className="w-full sm:w-auto" disabled={qrLoading || !qrReference.trim()}>
                      <QrCode aria-hidden="true" />
                      Verify via QR
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </SectionCard>

          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Verification results reflect the awarding institution's own records.
          </p>
        </Container>
      </main>

      <Footer />
    </div>
  );
}

// ─── Failure State Components ────────────────────────────────────────────────

function VerificationFailureState({
  identifier,
  method,
  onRetry,
}: {
  identifier: string;
  method: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-5 py-4">
      <div className="rounded-lg border border-info/30 bg-info-subtle p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-info">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">Verification completed</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No matching verified credential was found for the submitted identifier.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-md bg-card p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Identifier</span>
            <span className="font-mono text-xs text-foreground">{identifier || "—"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Method</span>
            <span className="text-xs text-foreground">{method}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="text-xs font-medium text-destructive">NOT VERIFIED</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          The submitted identifier could not be matched to a published certificate in the verification registry.
          This does not confirm or deny any academic status.
        </p>
      </div>

      <Button variant="outline" onClick={onRetry} className="w-full sm:w-auto">
        Try again
      </Button>
    </div>
  );
}

function OcrFailureState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-5 py-4">
      <div className="rounded-lg border border-warning/30 bg-warning-subtle p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-warning">
            <UploadIcon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">Document could not be processed</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We couldn't reliably extract a verification identifier from this document.
              The image may be too blurry, rotated, or the document format is not supported.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-md bg-card p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">OCR extraction</span>
            <span className="text-xs font-medium text-warning">UNABLE TO READ</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Registry lookup</span>
            <span className="text-xs text-muted-foreground">SKIPPED</span>
          </div>
        </div>
      </div>

      <Button variant="outline" onClick={onRetry} className="w-full sm:w-auto">
        Try another document
      </Button>
    </div>
  );
}

function NoIdentifierState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-5 py-4">
      <div className="rounded-lg border border-info/30 bg-info-subtle p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-info">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">No identifier found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              OCR completed successfully but no verification reference, certificate number,
              or registration number could be detected in this document.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-md bg-card p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">OCR extraction</span>
            <span className="text-xs font-medium text-success">SUCCESS</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Identifier detection</span>
            <span className="text-xs font-medium text-warning">NO IDENTIFIER FOUND</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Registry lookup</span>
            <span className="text-xs text-muted-foreground">SKIPPED</span>
          </div>
        </div>
      </div>

      <Button variant="outline" onClick={onRetry} className="w-full sm:w-auto">
        Try another document
      </Button>
    </div>
  );
}

function LowConfidenceState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-5 py-4">
      <div className="rounded-lg border border-warning/30 bg-warning-subtle p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-warning">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">Low confidence extraction</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              An identifier was detected but with low confidence. For accurate results,
              please enter the verification reference or certificate number directly.
            </p>
          </div>
        </div>
      </div>

      <Button variant="outline" onClick={onRetry} className="w-full sm:w-auto">
        Try again
      </Button>
    </div>
  );
}
