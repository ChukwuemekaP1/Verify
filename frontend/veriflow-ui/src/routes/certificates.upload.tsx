import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { CheckCircle2, FileWarning, Info, RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";

import { FileUpload } from "@/components/common/file-upload";
import { FormField } from "@/components/common/form-field";
import { OcrPreview } from "@/components/common/ocr-preview";
import { SectionCard } from "@/components/common/section-card";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "@/lib/api";
import type {
  CertificateStatus,
  CertificateType,
  OcrUploadResponse,
} from "@/lib/api/contracts";
import { toast } from "sonner";

export const Route = createFileRoute("/certificates/upload")({
  component: CertificateUploadPage,
  head: () => ({
    meta: [
      { title: "Upload certificate — Verifis" },
      {
        name: "description",
        content:
          "Upload a certificate, review AI-extracted fields and correct them before publishing a verifiable record.",
      },
      { property: "og:title", content: "Upload certificate — Verifis" },
      {
        property: "og:description",
        content: "Drag-and-drop upload with OCR extraction and manual correction.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const validationRules = [
  "Accepted formats: PDF, PNG, JPG",
  "Maximum file size: 10 MB",
  "Single page documents extract most reliably",
  "Scans should be at least 300 DPI and unrotated",
];

function normStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "number" ? String(v) : String(v);
  return s.trim();
}

function CertificateUploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const controlledFile = useMemo(() => (file ? { file } : null), [file]);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrUploadResponse | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [certificateNumber, setCertificateNumber] = useState("");
  const [graduateName, setGraduateName] = useState("");
  const [programmeName, setProgrammeName] = useState("");
  const [awardClass, setAwardClass] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [awardTitle, setAwardTitle] = useState("");
  const [certificateType, setCertificateType] = useState<CertificateType>("DEGREE");
  const [graduateReference, setGraduateReference] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [classification, setClassification] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [saveLoading, setSaveLoading] = useState(false);

  function applyOcrToForm(data: OcrUploadResponse) {
    const f = (key: string, fallback = "") => {
      const raw = (data.normalizedFields?.[key] as unknown) ?? data.extractedFields?.[key];
      return typeof raw === "undefined" || raw === null ? fallback : normStr(raw);
    };

    const certNo =
      f("certificateNumber") ||
      f("certificate_number") ||
      f("certificateNo") ||
      f("certNo") ||
      f("serialNumber") ||
      f("registrationNumber");

    const gradName =
      f("fullName") ||
      f("graduateName") ||
      f("graduate_full_name") ||
      [f("firstName"), f("middleName"), f("lastName")].filter(Boolean).join(" ") ||
      f("name");

    const prog =
      f("programme") ||
      f("program") ||
      f("course") ||
      f("courseOfStudy") ||
      f("degreeProgramme");

    const title =
      f("awardTitle") ||
      f("degreeAwarded") ||
      f("qualification") ||
      f("degreeTitle") ||
      f("award");

    const cls =
      f("classification") ||
      f("class") ||
      f("grade") ||
      f("honours") ||
      f("division");

    const date =
      f("issueDate") ||
      f("awardDate") ||
      f("graduationDate") ||
      f("dateIssued") ||
      f("conferredOn");

    const inst =
      f("institutionName") ||
      f("institution") ||
      f("university") ||
      f("issuer") ||
      f("issuingBody");

    const mat = f("matricNumber") || f("studentId") || f("studentNumber") || f("regNo");

    setCertificateNumber(certNo);
    setGraduateName(gradName);
    setProgrammeName(prog);
    setAwardTitle(title);
    setClassification(cls);
    setAwardClass(cls);
    setIssueDate(date);
    setInstitutionName(inst);
    setMatricNumber(mat);
  }

  async function runOcrUpload(selectedFile: File) {
    setOcrLoading(true);
    setOcrError(null);
    try {
      const res = await api.uploads.certificateOcr(selectedFile);
      const data = (res?.data ?? res ?? null) as OcrUploadResponse | null;
      setOcrResult(data);
      if (data) applyOcrToForm(data);
    } catch (err) {
      const msg =
        (err as { message?: string }).message ||
        "OCR extraction failed. You can still enter fields manually.";
      setOcrError(msg);
      toast.warning(msg);
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleFilesSelected(files: File[]) {
    const f = files[0] ?? null;
    setFile(f);
    if (f) {
      setOcrResult(null);
      await runOcrUpload(f);
    }
  }

  async function handleReOcr() {
    if (!file) {
      toast.error("Select a file first");
      return;
    }
    await runOcrUpload(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      toast.error("Upload a certificate document first");
      return;
    }
    if (!certificateNumber.trim()) {
      toast.error("Certificate number is required");
      return;
    }
    if (!awardTitle.trim()) {
      toast.error("Award title is required");
      return;
    }
    if (!issueDate.trim()) {
      toast.error("Issue date is required");
      return;
    }
    setSaveLoading(true);
    try {
      const [firstName = "", middleName = "", lastName = ""] = (graduateName || "").split(/\s+/);
      const extras: Record<string, unknown> = {
        certificateNumber: certificateNumber.trim(),
        type: certificateType,
        status: "VERIFIED" as CertificateStatus,
        issueDate: issueDate.trim(),
        expiryDate: expiryDate.trim() || undefined,
        awardTitle: awardTitle.trim(),
        programme: programmeName.trim() || undefined,
        classification: classification.trim() || awardClass.trim() || undefined,
        firstName: firstName.trim() || undefined,
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        fullName: graduateName.trim() || undefined,
        matricNumber: matricNumber.trim() || undefined,
        graduateId: graduateReference.trim() || undefined,
        institutionName: institutionName.trim() || undefined,
        publish: true,
      };
      const res = await api.uploads.certificateCreate(file, extras);
      const cert = res?.data?.certificate ?? res?.certificate;
      if (!cert?._id) {
        toast.error("Saved, but could not read the created certificate.");
        setSaveLoading(false);
        return;
      }
      toast.success("Certificate created and published");
      await router.navigate({
        to: "/certificates/$certificateId",
        params: { certificateId: cert._id },
      });
    } catch (err) {
      const msg = (err as { message?: string }).message || "Failed to save certificate.";
      toast.error(msg);
    } finally {
      setSaveLoading(false);
    }
  }

  const ocrConfidence = ocrResult?.ocr?.overallConfidence ?? null;

  return (
    <AppLayout title="Upload certificate" currentPath="/certificates">
      <PageSection className="space-y-6">
        <PageHeader
          title="Certificate upload"
          description="Upload a document, review the extracted fields, correct anything the model got wrong, then publish."
          crumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Certificates", href: "/certificates" },
            { label: "Upload" },
          ]}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/certificates">Cancel</Link>
            </Button>
          }
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <SectionCard
              title="Document"
              description="Drag and drop the certificate or browse your device"
            >
              <FileUpload
                label="Upload certificate document"
                hint="PDF, PNG or JPG"
                onFilesSelected={handleFilesSelected}
                controlledValue={controlledFile}
                error={ocrError || undefined}
                maxSizeMb={10}
              />
              {(ocrLoading || ocrResult) && (
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    {ocrLoading ? (
                      <Badge variant="info">Running OCR…</Badge>
                    ) : ocrResult ? (
                      <Badge variant="success">
                        OCR complete
                        {ocrConfidence !== null
                          ? ` · ${Math.round(ocrConfidence)}% confidence`
                          : ""}
                      </Badge>
                    ) : null}
                    {!ocrLoading && ocrResult ? (
                      <Button variant="ghost" size="sm" onClick={handleReOcr}>
                        <RotateCcw aria-hidden="true" />
                        Re-run extraction
                      </Button>
                    ) : null}
                  </div>
                  {ocrLoading ? (
                    <Skeleton className="h-5 w-44 rounded" />
                  ) : ocrResult?.ocr ? (
                    <span className="text-xs text-muted-foreground">
                      {ocrResult.ocr.wordCount} words · {ocrResult.ocr.charCount} chars ·{" "}
                      {Math.round(ocrResult.ocr.durationMs / 1000)}s
                    </span>
                  ) : null}
                </div>
              )}
            </SectionCard>

            <OcrPreview
              loading={ocrLoading}
              rawText={ocrResult?.ocr?.rawText ?? undefined}
              documentUrl={ocrResult?.upload?.documentUrl ?? undefined}
            />

            <SectionCard
              title="Extracted fields"
              description="Review and correct values before publishing"
            >
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField id="certificate-number" label="Certificate number" required>
                    <Input
                      id="certificate-number"
                      name="certificateNumber"
                      className="font-mono"
                      value={certificateNumber}
                      onChange={(e) => setCertificateNumber(e.target.value)}
                      placeholder="Awaiting extraction"
                    />
                  </FormField>
                  <FormField id="certificate-type" label="Certificate type" required>
                    <Select
                      name="certificate-type"
                      value={certificateType}
                      onValueChange={(v) => setCertificateType(v as CertificateType)}
                    >
                      <SelectTrigger id="certificate-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEGREE">Degree certificate</SelectItem>
                        <SelectItem value="DIPLOMA">Diploma</SelectItem>
                        <SelectItem value="TRANSCRIPT">Transcript</SelectItem>
                        <SelectItem value="CERTIFICATE">Certificate (other)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField id="graduate-name" label="Graduate name" required>
                    <Input
                      id="graduate-name"
                      name="graduateName"
                      value={graduateName}
                      onChange={(e) => setGraduateName(e.target.value)}
                      placeholder="Awaiting extraction"
                    />
                  </FormField>
                  <FormField id="matric-number" label="Matric number / Student ID">
                    <Input
                      id="matric-number"
                      name="matricNumber"
                      className="font-mono"
                      value={matricNumber}
                      onChange={(e) => setMatricNumber(e.target.value)}
                    />
                  </FormField>

                  <FormField id="award-title" label="Award title" required>
                    <Input
                      id="award-title"
                      name="awardTitle"
                      value={awardTitle}
                      onChange={(e) => setAwardTitle(e.target.value)}
                    />
                  </FormField>
                  <FormField id="programme-name" label="Programme">
                    <Input
                      id="programme-name"
                      name="programme"
                      value={programmeName}
                      onChange={(e) => setProgrammeName(e.target.value)}
                    />
                  </FormField>

                  <FormField id="award-class" label="Classification">
                    <Input
                      id="award-class"
                      name="classification"
                      value={classification || awardClass}
                      onChange={(e) => {
                        setAwardClass(e.target.value);
                        setClassification(e.target.value);
                      }}
                    />
                  </FormField>
                  <FormField id="issue-date" label="Issue date" required>
                    <Input
                      id="issue-date"
                      name="issueDate"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </FormField>

                  <FormField id="expiry-date" label="Expiry date (optional)">
                    <Input
                      id="expiry-date"
                      name="expiryDate"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </FormField>
                  <FormField id="institution-name" label="Issuing institution">
                    <Input
                      id="institution-name"
                      name="institutionName"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                    />
                  </FormField>

                  <FormField
                    id="graduate-reference"
                    label="Link to graduate (optional)"
                    hint="Existing graduate record ID (creates a new graduate if blank)"
                  >
                    <Input
                      id="graduate-reference"
                      name="graduateReference"
                      className="font-mono"
                      value={graduateReference}
                      onChange={(e) => setGraduateReference(e.target.value)}
                    />
                  </FormField>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" disabled={saveLoading}>
                    <Save aria-hidden="true" />
                    Save as draft
                  </Button>
                  <Button type="submit" disabled={saveLoading || !file}>
                    <CheckCircle2 aria-hidden="true" />
                    {saveLoading ? "Publishing…" : "Publish certificate"}
                  </Button>
                </div>
              </form>
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard title="File requirements" description="Validation applied on upload">
              <ul className="space-y-3">
                {validationRules.map((rule) => (
                  <li key={rule} className="flex gap-2.5 text-sm text-muted-foreground">
                    <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Before you publish" description="Common extraction issues">
              <ul className="space-y-3">
                {[
                  "Confirm the certificate number matches the printed document exactly.",
                  "Check names against the graduate record, including middle names.",
                  "Verify the issue date format before saving.",
                ].map((tip) => (
                  <li key={tip} className="flex gap-2.5 text-sm text-muted-foreground">
                    <FileWarning
                      className="mt-0.5 size-4 shrink-0 text-warning"
                      aria-hidden="true"
                    />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </div>
      </PageSection>
    </AppLayout>
  );
}
