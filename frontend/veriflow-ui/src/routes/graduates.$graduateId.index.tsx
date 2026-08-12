import { useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Pencil,
  Upload,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/common/data-table";
import { DetailList } from "@/components/common/detail-list";
import { FileUpload } from "@/components/common/file-upload";
import { ProtectedRoute } from "@/components/common/protected-route";
import { QrDisplay } from "@/components/common/qr-display";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { Grid } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { httpClient } from "@/lib/api/http-client";
import type {
  CertificateStatus,
  GraduateLevel,
  GraduateStatus,
} from "@/lib/api/contracts";

export const Route = createFileRoute("/graduates/$graduateId/")({
  component: ViewGraduatePage,
  head: () => ({
    meta: [
      { title: "Graduate profile — Verifis" },
      {
        name: "description",
        content:
          "Graduate details, academic record and certificate issuance history.",
      },
      { property: "og:title", content: "Graduate profile — Verifis" },
      {
        property: "og:description",
        content:
          "Academic record and certificate issuance history for a graduate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUS_VARIANT: Record<GraduateStatus, "success" | "neutral"> = {
  ACTIVE: "success",
  ARCHIVED: "neutral",
};

const STATUS_LABEL: Record<GraduateStatus, string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

const LEVEL_LABEL: Record<GraduateLevel, string> = {
  DIPLOMA: "Diploma",
  UNDERGRADUATE: "Undergraduate",
  POSTGRADUATE: "Postgraduate",
  DOCTORATE: "Doctorate",
};

const CERT_STATUS_VARIANT: Record<
  CertificateStatus,
  | "neutral"
  | "info"
  | "warning"
  | "success"
  | "default"
  | "destructive"
> = {
  DRAFT: "neutral",
  PROCESSING: "info",
  PENDING_REVIEW: "warning",
  VERIFIED: "success",
  PUBLISHED: "default",
  REVOKED: "destructive",
};

const CERT_STATUS_LABEL: Record<CertificateStatus, string> = {
  DRAFT: "Draft",
  PROCESSING: "Processing",
  PENDING_REVIEW: "Pending review",
  VERIFIED: "Verified",
  PUBLISHED: "Published",
  REVOKED: "Revoked",
};

function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return format(new Date(date), "dd MMM yyyy");
  } catch {
    return String(date);
  }
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return format(new Date(date), "dd MMM yyyy, HH:mm");
  } catch {
    return String(date);
  }
}

function ViewGraduatePage() {
  const { graduateId } = Route.useParams();
  const queryClient = useQueryClient();

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [ocrFields, setOcrFields] = useState<Record<string, string>>({});
  const [uploadedCertId, setUploadedCertId] = useState<string | null>(null);
  const [uploadConfidence, setUploadConfidence] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["graduates", "detail", graduateId],
    queryFn: async () => {
      const response = await api.graduates.detail(graduateId);
      return response.data!;
    },
    enabled: Boolean(graduateId),
  });

  const {
    data: certsData,
    isLoading: certsLoading,
    isError: certsError,
  } = useQuery({
    queryKey: ["certificates", "graduate", graduateId],
    queryFn: async () => {
      const response = await api.certificates.byGraduate(graduateId);
      return response.data!;
    },
    enabled: Boolean(graduateId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const res = await httpClient.upload<
        import("@/lib/api/contracts").CreateCertificateWithOcrResponse
      >(`/uploads/graduate/${graduateId}/certificate`, file, {
        publishNow: true,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["certificates", "graduate", graduateId],
      });
      queryClient.invalidateQueries({
        queryKey: ["graduates", "detail", graduateId],
      });
      const cert = data?.certificate;
      if (cert) {
        setUploadedCertId(cert._id);
        const rawData = data as Record<string, unknown>;
        const extracted = (rawData?.extractedFields ?? {}) as Record<
          string,
          unknown
        >;
        const normalized = (rawData?.normalizedFields ?? {}) as Record<
          string,
          unknown
        >;
        const fields: Record<string, string> = {};
        const source =
          Object.keys(normalized).length > 0 ? normalized : extracted;
        for (const [key, val] of Object.entries(source)) {
          if (val != null) fields[key] = String(val);
        }
        setOcrFields(fields);
        const confidence =
          data?.ocrSummary?.confidence ??
          (typeof extracted.overallConfidence === "number"
            ? extracted.overallConfidence
            : null);
        setUploadConfidence(confidence);
      }
      toast.success("Certificate uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload certificate");
    },
  });

  const correctMutation = useMutation({
    mutationFn: async ({
      certId,
      corrections,
    }: {
      certId: string;
      corrections: Record<string, unknown>;
    }) => {
      return api.uploads.certificateCorrect(certId, corrections);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["certificates", "graduate", graduateId],
      });
      queryClient.invalidateQueries({
        queryKey: ["graduates", "detail", graduateId],
      });
      toast.success("Certificate fields corrected");
      setOcrFields({});
      setUploadedCertId(null);
      setUploadConfidence(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to correct certificate fields");
    },
  });

  const graduate = data?.graduate;
  const displayName = graduate
    ? (graduate.fullName ?? `${graduate.firstName} ${graduate.lastName}`)
    : "Graduate";

  const institutionName =
    graduate && typeof graduate.institution === "object" && graduate.institution
      ? graduate.institution.name
      : undefined;

  const certificateCount =
    data?.certificateCount ??
    (graduate &&
    typeof (graduate as Record<string, unknown>).certificateCount === "number"
      ? ((graduate as Record<string, unknown>).certificateCount as number)
      : 0);

  const certificates = certsData?.items ?? [];

  const handleFileSelected = useCallback(
    (files: File[]) => {
      if (files.length > 0) {
        uploadMutation.mutate(files[0]);
      }
    },
    [uploadMutation],
  );

  const handleOcrFieldChange = (field: string, value: string) => {
    setOcrFields((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCorrections = () => {
    if (!uploadedCertId) return;
    correctMutation.mutate({
      certId: uploadedCertId,
      corrections: ocrFields,
    });
  };

  const handleCancelCorrection = () => {
    setOcrFields({});
    setUploadedCertId(null);
    setUploadConfidence(null);
  };

  const uploadedCertificate = certificates.find((c) => c._id === uploadedCertId);

  return (
    <ProtectedRoute roles={["SUPER_ADMIN", "INSTITUTION_ADMIN"]}>
      <AppLayout
        title="Graduate"
        currentPath="/graduates"
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link to="/graduates/$graduateId/edit" params={{ graduateId }}>
              <Pencil aria-hidden="true" />
              Edit record
            </Link>
          </Button>
        }
      >
        <PageSection className="space-y-6">
          <PageHeader
            title={displayName}
            description="Academic record and issued certificates."
            crumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Graduates", href: "/graduates" },
              { label: "Profile" },
            ]}
          />

          <Grid cols={3}>
            <StatCard
              label="Certificates issued"
              loading={isLoading}
              value={isLoading ? undefined : String(certificateCount)}
            />
            <StatCard label="Verifications received" loading={isLoading} />
            <StatCard
              label="Award classification"
              loading={isLoading}
              value={isLoading ? undefined : graduate?.classification}
            />
          </Grid>

          <SectionCard
            title="Personal details"
            description="Used as the source of truth for verification responses"
          >
            <DetailList
              columns={3}
              loading={isLoading}
              items={[
                { label: "First name", value: graduate?.firstName },
                {
                  label: "Middle name(s)",
                  value: graduate?.middleName ?? "—",
                },
                { label: "Last name", value: graduate?.lastName },
                {
                  label: "Date of birth",
                  value: formatDate(graduate?.dateOfBirth),
                },
                {
                  label: "Email address",
                  value: graduate?.email ?? "—",
                },
                { label: "Phone number", value: graduate?.phone ?? "—" },
                {
                  label: "National ID / passport",
                  mono: true,
                  value: graduate?.nationalId ?? "—",
                },
                {
                  label: "Record status",
                  value: graduate ? (
                    <Badge
                      variant={STATUS_VARIANT[graduate.status] ?? "neutral"}
                    >
                      {STATUS_LABEL[graduate.status] ?? graduate.status}
                    </Badge>
                  ) : undefined,
                },
                {
                  label: "Record created",
                  value: formatDateTime(graduate?.createdAt),
                },
              ]}
            />
          </SectionCard>

          <SectionCard
            title="Academic record"
            description="Institution, programme and graduation details"
          >
            <DetailList
              columns={3}
              loading={isLoading}
              items={[
                { label: "Institution", value: institutionName },
                {
                  label: "Matriculation no.",
                  mono: true,
                  value: graduate?.matricNumber,
                },
                {
                  label: "Level",
                  value: graduate?.level
                    ? (LEVEL_LABEL[graduate.level] ?? graduate.level)
                    : undefined,
                },
                { label: "Programme of study", value: graduate?.programme },
                {
                  label: "Graduation year",
                  value: graduate?.graduationYear ?? "—",
                },
                {
                  label: "Graduation date",
                  value: formatDate(
                    graduate?.graduationDate as string | undefined,
                  ),
                },
                {
                  label: "Degree classification",
                  value: graduate?.classification ?? "—",
                },
                { label: "Notes", value: graduate?.notes ?? "—" },
                {
                  label: "Last updated",
                  value: formatDateTime(graduate?.updatedAt),
                },
              ]}
            />
          </SectionCard>

          {/* ── Certificates ─────────────────────────────────────────── */}
          <SectionCard
            title="Certificates"
            description="Records issued against this graduate profile"
            footer={
              <Button variant="outline" size="sm" asChild>
                <Link to="/certificates/new" search={{ graduateId }}>
                  Issue certificate
                </Link>
              </Button>
            }
          >
            <DataTable
              columns={[
                { id: "reference", header: "Certificate no." },
                { id: "award", header: "Award" },
                { id: "status", header: "Status" },
                { id: "verification", header: "Verification ref." },
                { id: "actions", header: "" },
              ]}
              caption="Certificates linked to this graduate"
              isLoading={certsLoading}
              isError={certsError}
              isEmpty={certificates.length === 0}
              emptyTitle="No certificates yet"
              emptyDescription="Upload a certificate below to get started."
              emptyAction={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUploadForm(true)}
                >
                  <Upload aria-hidden="true" />
                  Upload certificate
                </Button>
              }
            >
              {certificates.map((cert) => (
                <TableRow key={cert._id}>
                  <TableCell className="font-mono text-sm">
                    {cert.certificateNumber}
                  </TableCell>
                  <TableCell>{cert.awardTitle}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        CERT_STATUS_VARIANT[
                          cert.status as CertificateStatus
                        ] ?? "neutral"
                      }
                    >
                      {CERT_STATUS_LABEL[
                        cert.status as CertificateStatus
                      ] ?? cert.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {cert.verificationReference ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" asChild>
                      <Link
                        to="/certificates/$certificateId"
                        params={{ certificateId: cert._id }}
                      >
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
          </SectionCard>

          {/* ── Certificate upload ───────────────────────────────────── */}
          <SectionCard
            title="Upload certificate"
            description="Upload a certificate document — OCR will extract details automatically"
          >
            {!showUploadForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadForm(true)}
              >
                <Upload aria-hidden="true" />
                Upload Certificate
              </Button>
            ) : (
              <div className="space-y-6">
                <FileUpload
                  label="Certificate document"
                  hint="PDF, PNG or JPG — max 10 MB"
                  accept=".pdf,.png,.jpg,.jpeg"
                  maxSizeMb={10}
                  progress={uploadMutation.isPending ? 30 : undefined}
                  error={
                    uploadMutation.isError
                      ? uploadMutation.error?.message
                      : undefined
                  }
                  onFilesSelected={handleFileSelected}
                />

                {/* OCR-extracted fields review */}
                {uploadedCertId && Object.keys(ocrFields).length > 0 && (
                  <div className="space-y-4 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">
                        Extracted fields
                      </h4>
                      {uploadConfidence != null && (
                        <div className="flex items-center gap-2">
                          {uploadConfidence >= 0.8 ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : uploadConfidence >= 0.5 ? (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {Math.round(uploadConfidence * 100)}% confidence
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {Object.entries(ocrFields).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </label>
                          <Input
                            value={value}
                            onChange={(e) =>
                              handleOcrFieldChange(key, e.target.value)
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveCorrections}
                        disabled={correctMutation.isPending}
                      >
                        <Save aria-hidden="true" />
                        {correctMutation.isPending
                          ? "Saving…"
                          : "Save corrections"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelCorrection}
                        disabled={correctMutation.isPending}
                      >
                        <X aria-hidden="true" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* QR code for published certificate */}
                {uploadedCertificate?.status === "PUBLISHED" && (
                  <QrDisplay
                    src={uploadedCertificate.verificationQrCodeUrl}
                    reference={uploadedCertificate.verificationReference}
                  />
                )}

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowUploadForm(false);
                      handleCancelCorrection();
                    }}
                  >
                    {showUploadForm && uploadedCertId ? (
                      <>
                        <ChevronUp aria-hidden="true" />
                        Close
                      </>
                    ) : (
                      <>
                        <ChevronUp aria-hidden="true" />
                        Cancel
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>
        </PageSection>
      </AppLayout>
    </ProtectedRoute>
  );
}
