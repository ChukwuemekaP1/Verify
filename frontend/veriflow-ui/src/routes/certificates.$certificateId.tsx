import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileCheck2, QrCode, RefreshCcw } from "lucide-react";

import { DetailList } from "@/components/common/detail-list";
import { EmptyState } from "@/components/common/empty-state";
import { QrDisplay } from "@/components/common/qr-display";
import { SectionCard } from "@/components/common/section-card";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { api } from "@/lib/api";
import type {
  Certificate,
  PaginatedResponse,
  VerificationRecord,
} from "@/lib/api/contracts";

type LoadedCertificate = Certificate & {
  graduateName?: string | null;
  matricNumber?: string | null;
};

export const Route = createFileRoute("/certificates/$certificateId")({
  component: CertificateDetailsPage,
  loader: async ({ params }) => {
    const certId = params.certificateId;
    const [certRes, histRes] = await Promise.all([
      api.certificates.detail(certId).catch(() => null),
      api.verifications.byCertificate(certId, { limit: 10 }).catch(() => null),
    ]);
    const cert = (certRes?.data?.certificate ??
      certRes?.certificate ??
      certRes?.data ??
      certRes ??
      null) as LoadedCertificate | null;
    const history = (histRes?.data ?? histRes ?? null) as PaginatedResponse<VerificationRecord> | null;
    return { cert, history };
  },
  head: () => ({
    meta: [
      { title: "Certificate details — Verifis" },
      {
        name: "description",
        content:
          "Certificate record, linked graduate, QR status, extraction summary and verification history.",
      },
      { property: "og:title", content: "Certificate details — Verifis" },
      {
        property: "og:description",
        content: "Review a certificate record, its QR status and verification history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CertificateDetailsPage() {
  const { cert, history } = Route.useLoaderData();
  const items = history?.items ?? [];
  const hasCert = !!cert;

  const hasQr = Boolean(cert?.verificationQrCodeUrl || cert?.verificationReference);

  return (
    <AppLayout
      title="Certificate"
      currentPath="/certificates"
      actions={
        <Button size="sm" variant="outline">
          <Download aria-hidden="true" />
          Download
        </Button>
      }
    >
      <PageSection className="space-y-6">
        <PageHeader
          title="Certificate details"
          description="The issued record, its linked graduate and current QR status."
          crumbs={[
            { label: "Certificates", href: "/certificates" },
            { label: cert?.certificateNumber ?? "Details" },
          ]}
          actions={
            <Button size="sm" variant="outline" asChild>
              <Link to="/certificates/upload">Replace document</Link>
            </Button>
          }
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <SectionCard title="Certificate information" description="Loaded from the record">
              <DetailList
                columns={2}
                items={[
                  {
                    label: "Certificate number",
                    mono: true,
                    value: cert?.certificateNumber,
                  },
                  { label: "Award title", value: cert?.awardTitle },
                  { label: "Programme", value: cert?.programme ?? undefined },
                  { label: "Classification", value: cert?.classification ?? undefined },
                  {
                    label: "Issue date",
                    value: cert?.issueDate ? new Date(cert.issueDate).toLocaleDateString() : undefined,
                  },
                  {
                    label: "Status",
                    value: cert?.status ? (
                      <Badge
                        variant={
                          cert.status === "PUBLISHED" || cert.status === "ACTIVE"
                            ? "success"
                            : cert.status === "PENDING"
                              ? "warning"
                              : cert.status === "REVOKED"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {cert.status}
                      </Badge>
                    ) : undefined,
                  },
                ]}
              />
            </SectionCard>

            <SectionCard title="Graduate information" description="Owner of this certificate">
              <DetailList
                columns={2}
                items={[
                  {
                    label: "Full name",
                    value:
                      cert?.graduateName ??
                      (typeof cert?.graduate === "object" && cert.graduate
                        ? [cert.graduate.firstName, cert.graduate.middleName, cert.graduate.lastName]
                            .filter(Boolean)
                            .join(" ")
                        : undefined),
                  },
                  {
                    label: "Matriculation number",
                    mono: true,
                    value:
                      cert?.matricNumber ??
                      (typeof cert?.graduate === "object" && cert.graduate
                        ? cert.graduate.matricNumber
                        : undefined),
                  },
                  { label: "Programme", value: cert?.programme ?? undefined },
                  {
                    label: "Graduation year",
                    value: cert?.issueDate ? String(new Date(cert.issueDate).getFullYear()) : undefined,
                  },
                ]}
              />
            </SectionCard>

            <SectionCard title="Certificate preview" description="Uploaded source document" bodyClassName="p-0">
              {cert?.documentUrl ? (
                <div className="flex items-center justify-center bg-muted/40 p-8">
                  <img
                    src={cert.documentUrl}
                    alt="Certificate document"
                    className="max-h-[480px] max-w-full rounded-md border object-contain shadow-sm"
                  />
                </div>
              ) : (
                <EmptyState
                  icon={FileCheck2}
                  title="No document loaded"
                  description="The uploaded certificate image or PDF renders here once the record is available."
                  className="py-14"
                />
              )}
            </SectionCard>

            <SectionCard
              title="Verification history"
              description="Requests received for this certificate"
              bodyClassName="p-0"
            >
              {items.length === 0 ? (
                <EmptyState
                  title="No verification requests"
                  description="Each public verification attempt for this certificate will be listed here."
                  className="py-10"
                />
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((v) => {
                    const tone =
                      v.status === "AUTHENTIC"
                        ? "success"
                        : v.status === "SUSPICIOUS"
                          ? "warning"
                          : v.status === "PENDING" || v.status === "IN_PROGRESS"
                            ? "neutral"
                            : "danger";
                    return (
                      <li key={v._id} className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant={tone as "success" | "warning" | "danger" | "neutral"}>
                            {v.status}
                          </Badge>
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            {v.method}
                          </span>
                          <span className="ml-auto text-xs font-mono">{v.verificationReference}</span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Confidence {v.confidenceScore != null ? `${Math.round(v.confidenceScore)}%` : "—"}
                          {" · "}
                          {new Date(v.completedAt ?? v.createdAt).toLocaleString()}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard
              title="QR status"
              description="Public verification code"
              actions={
                <Badge variant={hasCert ? (hasQr ? "success" : "warning") : "neutral"}>
                  {hasCert ? (hasQr ? "Published" : "Awaiting generation") : "Awaiting status"}
                </Badge>
              }
              bodyClassName="p-0"
            >
              <QrDisplay
                className="border-0 shadow-none"
                src={cert?.verificationQrCodeUrl ?? undefined}
                reference={cert?.verificationReference}
              />
            </SectionCard>

            <SectionCard title="Code actions" description="Issue-management buttons">
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <QrCode aria-hidden="true" />
                  Generate QR code
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCcw aria-hidden="true" />
                  Revoke and reissue
                </Button>
              </div>
            </SectionCard>

            <SectionCard title="Extraction summary" description="From document intake">
              <DetailList
                columns={1}
                items={[
                  {
                    label: "Extraction confidence",
                    value:
                      (cert?.metadata as { ocrConfidence?: number } | undefined)?.ocrConfidence != null
                        ? `${Math.round(Number((cert.metadata as { ocrConfidence: number }).ocrConfidence) * 100) / 100}%`
                        : undefined,
                  },
                  {
                    label: "Fields corrected",
                    value: (cert?.metadata as { correctedFieldsCount?: number } | undefined)
                      ?.correctedFieldsCount
                      ? String(
                          (cert.metadata as { correctedFieldsCount: number }).correctedFieldsCount,
                        )
                      : undefined,
                  },
                  {
                    label: "Reviewed by",
                    value:
                      typeof (cert as { reviewedBy?: { firstName?: string; lastName?: string; email?: string } | null }).reviewedBy ===
                        "object" &&
                      (cert as { reviewedBy?: { firstName?: string; lastName?: string; email?: string } | null }).reviewedBy
                        ? [
                            (cert as { reviewedBy: { firstName?: string; lastName?: string } }).reviewedBy.firstName,
                            (cert as { reviewedBy: { firstName?: string; lastName?: string } }).reviewedBy.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ") ||
                          (cert as { reviewedBy: { email?: string } }).reviewedBy.email
                        : undefined,
                  },
                  {
                    label: "Reviewed at",
                    value: (cert as { reviewedAt?: string | null })?.reviewedAt
                      ? new Date((cert as { reviewedAt: string }).reviewedAt).toLocaleString()
                      : undefined,
                  },
                ]}
              />
            </SectionCard>
          </div>
        </div>
      </PageSection>
    </AppLayout>
  );
}
