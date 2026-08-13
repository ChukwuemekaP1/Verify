import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DetailList } from "@/components/common/detail-list";
import { SectionCard } from "@/components/common/section-card";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateLong, formatDateTimeShort } from "@/lib/utils";

import { api } from "@/lib/api";
import type { PublicVerifyResponse, ReferenceLookupResponse, VerificationStatus } from "@/lib/api/contracts";

export const Route = createFileRoute("/verify/result")({
  component: VerificationResultPage,
  validateSearch: (search: Record<string, unknown>) => ({
    ref: (search.ref as string) || "",
    method: (search.method as string) || "reference",
  }),
  loaderDeps: ({ search: { ref } }) => ({ ref }),
  loader: async ({ deps: { ref } }) => {
    if (!ref) return null;
    const res = await api.verifications.lookupReference(ref);
    return res?.data ?? res ?? null;
  },
  head: () => ({
    meta: [
      { title: "Verification result — Verifis" },
      {
        name: "description",
        content: "Outcome of a certificate verification from the Verifis registry.",
      },
      { property: "og:title", content: "Verification result — Verifis" },
      {
        property: "og:description",
        content: "Certificate verification result from the Verifis registry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type OutcomeTone = "verified" | "revoked" | "not_found" | "error";

const toneMap: Record<
  OutcomeTone,
  {
    label: string;
    headline: string;
    body: string;
    badge: "success" | "danger" | "info" | "neutral";
    icon: typeof CheckCircle2;
    ring: string;
    tone: string;
    bgGradient: string;
  }
> = {
  verified: {
    label: "Certificate Verified",
    headline: "This credential has been verified",
    body: "The certificate matches a published record in the issuing institution's registry. All details below are confirmed by the awarding body.",
    badge: "success",
    icon: CheckCircle2,
    ring: "border-success/30",
    tone: "text-success",
    bgGradient: "bg-gradient-to-br from-success-subtle to-card",
  },
  revoked: {
    label: "Revoked",
    headline: "This certificate has been revoked",
    body: "The issuing institution has revoked this certificate. It is no longer valid.",
    badge: "danger",
    icon: ShieldX,
    ring: "border-destructive/30",
    tone: "text-destructive",
    bgGradient: "bg-gradient-to-br from-destructive-subtle to-card",
  },
  not_found: {
    label: "Not Verified",
    headline: "No matching verified credential was found",
    body: "The verification system completed its search but could not locate a published certificate matching the submitted identifier. This does not confirm or deny any academic status.",
    badge: "info",
    icon: ShieldCheck,
    ring: "border-info/30",
    tone: "text-info",
    bgGradient: "bg-gradient-to-br from-info-subtle to-card",
  },
  error: {
    label: "Error",
    headline: "Verification could not be completed",
    body: "An unexpected error occurred during the verification process. Please try again or contact the institution.",
    badge: "danger",
    icon: AlertTriangle,
    ring: "border-destructive/30",
    tone: "text-destructive",
    bgGradient: "bg-gradient-to-br from-destructive-subtle to-card",
  },
};

function VerificationResultPage() {
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const lookup = loaderData as PublicVerifyResponse | ReferenceLookupResponse | null;

  const isPublicVerify = lookup && "verifiedAt" in lookup && lookup.verified;
  const isLegacyLookup = lookup && "lookedUpAt" in lookup;

  const toneKey: OutcomeTone = useMemo(() => {
    if (!lookup) return search.ref ? "error" : "not_found";

    if (isPublicVerify) {
      const pub = lookup as PublicVerifyResponse;
      if (pub.verified && pub.certificate?.status === "PUBLISHED") return "verified";
      if (pub.certificate?.status === "REVOKED") return "revoked";
      return "not_found";
    }

    if (isLegacyLookup) {
      const leg = lookup as ReferenceLookupResponse;
      const certStatus = leg.certificate && "status" in leg.certificate ? leg.certificate.status : undefined;
      if (certStatus === "PUBLISHED") return "verified";
      if (certStatus === "REVOKED") return "revoked";
      return "not_found";
    }

    return "not_found";
  }, [lookup, search.ref, isPublicVerify, isLegacyLookup]);

  const tone = toneMap[toneKey];
  const Icon = tone.icon;

  const certificate = isPublicVerify
    ? (lookup as PublicVerifyResponse).certificate
    : (lookup as ReferenceLookupResponse)?.certificate;
  const graduate = isPublicVerify
    ? (lookup as PublicVerifyResponse).graduate
    : (lookup as ReferenceLookupResponse)?.graduate;
  const institution = isPublicVerify
    ? (lookup as PublicVerifyResponse).institution
    : (lookup as ReferenceLookupResponse)?.institution;

  const verificationRef =
    (certificate && "verificationReference" in certificate ? certificate.verificationReference : null) ??
    (isLegacyLookup ? (lookup as ReferenceLookupResponse).verificationReference : null) ??
    search.ref;

  const verifiedAt = isPublicVerify
    ? (lookup as PublicVerifyResponse).verifiedAt
    : (isLegacyLookup ? ((lookup as ReferenceLookupResponse).completedAt ?? (lookup as ReferenceLookupResponse).lookedUpAt) : null);

  const methodLabel =
    search.method === "number"
      ? "Certificate number"
      : search.method === "upload"
        ? "Document upload (OCR)"
        : search.method === "qr"
          ? "QR code"
          : "Verification reference";

  const isVerified = toneKey === "verified";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
        <Container className="flex h-14 items-center justify-between">
          <Link to="/" className="focus-ring rounded-md">
            <Logo />
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link to="/verify">New verification</Link>
          </Button>
        </Container>
      </header>

      <main className="flex-1 py-8 sm:py-12">
        <Container size="narrow" className="space-y-6">
          {/* ── Status Header ── */}
          <section className={cn("overflow-hidden rounded-xl border", tone.ring, tone.bgGradient)}>
            <div className="p-5 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <span
                    className={cn(
                      "grid size-14 shrink-0 place-items-center rounded-2xl bg-card shadow-sm",
                      tone.tone,
                    )}
                  >
                    <Icon className="size-7" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <Badge variant={tone.badge} className="mb-2">
                      {tone.label}
                    </Badge>
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {tone.headline}
                    </h1>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {tone.body}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary row */}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-card/60 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Method</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{methodLabel}</p>
                </div>
                <div className="rounded-lg bg-card/60 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Reference</p>
                  <p className="mt-1 truncate font-mono text-xs text-foreground">{verificationRef || "—"}</p>
                </div>
                <div className="rounded-lg bg-card/60 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Institution</p>
                  <p className="mt-1 truncate text-sm text-foreground">{institution?.name ?? "—"}</p>
                </div>
                <div className="rounded-lg bg-card/60 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Verified at</p>
                  <p className="mt-1 font-mono text-xs text-foreground">
                    {verifiedAt ? formatDateTimeShort(verifiedAt) : "—"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Verified: Certificate Details ── */}
          {isVerified && certificate && (
            <>
              <SectionCard
                title="Certificate details"
                description="As recorded by the issuing institution"
              >
                <DetailList
                  items={[
                    {
                      label: "Certificate number",
                      value: certificate.certificateNumber ?? "—",
                      mono: true,
                    },
                    {
                      label: "Graduate name",
                      value: graduate?.fullName ?? [graduate?.firstName, graduate?.middleName, graduate?.lastName].filter(Boolean).join(" ") ?? "—",
                    },
                    {
                      label: "Registration number",
                      value: (isPublicVerify
                        ? (graduate as PublicVerifyResponse["graduate"])?.registrationNumber
                        : (graduate as ReferenceLookupResponse["graduate"])?.matricNumber) ?? "—",
                      mono: true,
                    },
                    {
                      label: "Programme / Degree",
                      value: certificate.programme ?? graduate?.programme ?? "—",
                    },
                    {
                      label: "Classification",
                      value: certificate.classification ?? (graduate as PublicVerifyResponse["graduate"])?.classification ?? "—",
                    },
                    {
                      label: "Graduation year",
                      value: graduate?.graduationYear ?? "—",
                    },
                    {
                      label: "Issue date",
                      value: certificate.issueDate ? formatDateLong(certificate.issueDate) : "—",
                    },
                    {
                      label: "Credential status",
                      value: certificate.status ?? "—",
                    },
                  ]}
                />
              </SectionCard>

              <SectionCard title="Issuing institution" description="Awarding body">
                <DetailList
                  items={[
                    { label: "Institution", value: institution?.name ?? "—" },
                    {
                      label: "Country / City",
                      value: [institution?.country, institution?.city]
                        .filter(Boolean)
                        .join(", ") || "—",
                    },
                    {
                      label: "Website",
                      value: institution?.website ?? "—",
                    },
                  ]}
                />
              </SectionCard>

              {certificate.documentUrl && (
                <div className="flex gap-2">
                  <Button asChild>
                    <a href={certificate.documentUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="size-4" aria-hidden="true" />
                      View certificate
                    </a>
                  </Button>
                </div>
              )}
            </>
          )}

          {/* ── Not Found state ── */}
          {!isVerified && toneKey === "not_found" && (
            <SectionCard title="Verification details" description="What was checked">
              <DetailList
                items={[
                  {
                    label: "Identifier submitted",
                    value: search.ref || "—",
                    mono: true,
                  },
                  {
                    label: "Verification method",
                    value: methodLabel,
                  },
                  {
                    label: "Registry search",
                    value: "Completed — no match found",
                  },
                  {
                    label: "Result",
                    value: "No matching verified credential",
                  },
                  {
                    label: "Timestamp",
                    value: verifiedAt ? formatDateTimeShort(verifiedAt) : new Date().toISOString(),
                    mono: true,
                  },
                ]}
              />
            </SectionCard>
          )}

          {/* ── Audit Reference ── */}
          <SectionCard title="Audit reference" description="Retain this for your records">
            <DetailList
              items={[
                {
                  label: "Verification reference",
                  value: verificationRef || "—",
                  mono: true,
                },
                {
                  label: "Method",
                  value: methodLabel,
                },
                {
                  label: "Requested by",
                  value: "Public",
                },
                {
                  label: "Timestamp",
                  value: verifiedAt ? formatDateTimeShort(verifiedAt) : "—",
                  mono: true,
                },
              ]}
            />
          </SectionCard>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link to="/verify">Verify another certificate</Link>
            </Button>
            <Button variant="outline">
              <Download aria-hidden="true" />
              Download report
            </Button>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
