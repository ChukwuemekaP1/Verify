import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BadgeAlert,
  CheckCircle2,
  Download,
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateLong, formatDateTimeShort } from "@/lib/utils";

import { api } from "@/lib/api";
import type { ReferenceLookupResponse, VerificationStatus } from "@/lib/api/contracts";

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
        content:
          "Outcome of a certificate verification, including institution details, confidence and an auditable timestamp.",
      },
      { property: "og:title", content: "Verification result — Verifis" },
      {
        property: "og:description",
        content: "Authentic, suspicious or invalid — with confidence and audit reference.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type OutcomeTone = "authentic" | "suspicious" | "invalid" | "not_found" | "pending" | "error";

const toneMap: Record<
  OutcomeTone,
  {
    label: string;
    headline: string;
    body: string;
    badge: "success" | "warning" | "danger" | "info" | "neutral";
    icon: typeof CheckCircle2;
    ring: string;
    tone: string;
  }
> = {
  authentic: {
    label: "Authentic",
    headline: "Certificate confirmed authentic",
    body: "The record matches the issuing institution's data with no discrepancies detected.",
    badge: "success",
    icon: CheckCircle2,
    ring: "border-success/30 bg-success-subtle",
    tone: "text-success",
  },
  suspicious: {
    label: "Suspicious",
    headline: "Certificate needs manual review",
    body: "Some fields do not align with the institution's record. A reviewer should confirm before relying on this result.",
    badge: "warning",
    icon: ShieldAlert,
    ring: "border-warning/30 bg-warning-subtle",
    tone: "text-warning",
  },
  invalid: {
    label: "Invalid",
    headline: "Certificate invalid or revoked",
    body: "This record has been revoked by the issuing institution, or it failed to match stored credential details.",
    badge: "danger",
    icon: ShieldX,
    ring: "border-destructive/30 bg-destructive-subtle",
    tone: "text-destructive",
  },
  not_found: {
    label: "Not found",
    headline: "No matching record found",
    body: "We could not locate a published certificate matching the provided reference or number.",
    badge: "info",
    icon: XCircle,
    ring: "border-info/30 bg-info-subtle",
    tone: "text-info",
  },
  pending: {
    label: "In progress",
    headline: "Verification in progress",
    body: "The verification is still being computed. Refresh this page in a moment.",
    badge: "neutral",
    icon: ShieldCheck,
    ring: "border-muted/30 bg-surface",
    tone: "text-muted-foreground",
  },
  error: {
    label: "Error",
    headline: "Verification error",
    body: "An unexpected error occurred while running this verification. Try again or contact the institution.",
    badge: "danger",
    icon: AlertTriangle,
    ring: "border-destructive/30 bg-destructive-subtle",
    tone: "text-destructive",
  },
};

function statusToTone(status?: VerificationStatus | string | null): OutcomeTone {
  if (!status) return "pending";
  switch (status) {
    case "AUTHENTIC":
      return "authentic";
    case "SUSPICIOUS":
      return "suspicious";
    case "INVALID":
    case "REVOKED":
      return "invalid";
    case "NOT_FOUND":
      return "not_found";
    case "PENDING":
    case "IN_PROGRESS":
      return "pending";
    case "ERROR":
    default:
      return status === "ERROR" ? "error" : "pending";
  }
}

function VerificationResultPage() {
  const search = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const lookup: ReferenceLookupResponse | null = loaderData as ReferenceLookupResponse | null;
  const [manual, setManual] = useState<OutcomeTone | null>(null);

  useEffect(() => {
    if (!search.ref) {
      setManual("not_found");
    }
  }, [search.ref]);

  const toneKey: OutcomeTone = useMemo(() => {
    if (manual) return manual;
    const certStatus =
      lookup && typeof lookup.certificate === "object" && "status" in lookup.certificate
        ? (lookup.certificate as { status?: string }).status
        : undefined;
    const isPublished = certStatus === "PUBLISHED";
    if (!isPublished && lookup && lookup.status === "AUTHENTIC") {
      return statusToTone(lookup.status);
    }
    const status = lookup?.status ?? (isPublished ? "AUTHENTIC" : undefined);
    return statusToTone(status ?? (search.ref ? "pending" : "not_found"));
  }, [lookup, manual, search.ref]);

  const tone = toneMap[toneKey];
  const Icon = tone.icon;
  const confidence = lookup?.confidenceScore ?? null;
  const verificationRef =
    lookup?.verificationReference ?? (typeof lookup?.certificate === "object" &&
    lookup.certificate &&
    "verificationReference" in lookup.certificate
      ? (lookup.certificate as { verificationReference?: string }).verificationReference
      : search.ref);

  const verifiedAt = lookup?.completedAt ?? lookup?.lookedUpAt ?? lookup?.createdAt;

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
          <section className={cn("rounded-lg border p-5 sm:p-6", tone.ring)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-full bg-card",
                    tone.tone,
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-title text-foreground">{tone.headline}</h1>
                    <Badge variant={tone.badge}>{tone.label}</Badge>
                  </div>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">{tone.body}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 bg-card">
                <Download aria-hidden="true" />
                Download report
              </Button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Match confidence</p>
                  {confidence === null ? (
                    <Skeleton className="h-4 w-14 rounded" />
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">
                      {Math.round(confidence)}%
                    </span>
                  )}
                </div>
                <Progress
                  value={confidence ?? 0}
                  className="mt-2 h-1.5"
                  aria-hidden={confidence === null}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Verified at</p>
                <p className="mt-1 font-mono text-sm text-foreground">
                  {verifiedAt ? formatDateTimeShort(verifiedAt) : "—"}
                </p>
              </div>
            </div>
          </section>

          <SectionCard
            title="Certificate information"
            description="As recorded by the institution"
          >
            <DetailList
              items={[
                {
                  label: "Certificate number",
                  value:
                    (typeof lookup?.certificate === "object" && lookup.certificate
                      ? (lookup.certificate as { certificateNumber?: string }).certificateNumber
                      : undefined) ?? "—",
                  mono: true,
                },
                {
                  label: "Graduate name",
                  value: lookup?.graduate?.fullName
                    ? `${lookup.graduate.firstName} ${lookup.graduate.middleName ?? ""} ${lookup.graduate.lastName}`.trim()
                    : "—",
                },
                {
                  label: "Matric number",
                  value: lookup?.graduate?.matricNumber ?? "—",
                  mono: true,
                },
                {
                  label: "Programme",
                  value: lookup?.graduate?.programme ?? "—",
                },
                {
                  label: "Qualification level",
                  value:
                    (typeof lookup?.certificate === "object" && lookup.certificate
                      ? (lookup.certificate as { type?: string }).type
                      : undefined) ?? "—",
                },
                {
                  label: "Classification",
                  value:
                    (typeof lookup?.certificate === "object" && lookup.certificate
                      ? (lookup.certificate as { classification?: string }).classification
                      : undefined) ??
                    lookup?.graduate?.programme?.includes("First")
                      ? "First Class"
                      : "—",
                },
                {
                  label: "Issue date",
                  value:
                    (typeof lookup?.certificate === "object" && lookup.certificate
                      ? (lookup.certificate as { issueDate?: string }).issueDate
                      : undefined)
                      ? formatDateLong(
                          (lookup.certificate as { issueDate: string }).issueDate,
                        )
                      : "—",
                },
                {
                  label: "Status",
                  value:
                    (typeof lookup?.certificate === "object" && lookup.certificate
                      ? (lookup.certificate as { status?: string }).status
                      : undefined) ?? "—",
                },
              ]}
            />
          </SectionCard>

          <SectionCard title="Institution information" description="Awarding body">
            <DetailList
              items={[
                { label: "Institution", value: lookup?.institution?.name ?? "—" },
                {
                  label: "Accreditation reference",
                  value:
                    (lookup?.institution as { verificationPrefix?: string } | undefined)
                      ?.verificationPrefix ?? "—",
                  mono: true,
                },
                {
                  label: "Country / City",
                  value: [lookup?.institution?.country, lookup?.institution?.city]
                    .filter(Boolean)
                    .join(", ") || "—",
                },
                {
                  label: "Institution status",
                  value: lookup?.institution?.status ?? "—",
                },
              ]}
            />
          </SectionCard>

          <SectionCard title="Verification record" description="Keep this reference for audit">
            <DetailList
              items={[
                {
                  label: "Verification reference",
                  value: verificationRef || "—",
                  mono: true,
                },
                {
                  label: "Method used",
                  value:
                    search.method === "number"
                      ? "Certificate number"
                      : search.method === "upload"
                        ? "Document upload + OCR"
                        : search.method === "qr"
                          ? "QR code"
                          : lookup?.lookupMethod === "CERTIFICATE_REFERENCE"
                            ? "Direct certificate reference"
                            : "Verification record reference",
                },
                { label: "Requested by", value: "Public" },
                {
                  label: "Timestamp",
                  value: verifiedAt ? formatDateTimeShort(verifiedAt) : "—",
                  mono: true,
                },
                {
                  label: "Previous verifications",
                  value:
                    lookup?.certificate && "verificationCount" in lookup.certificate
                      ? String((lookup.certificate as { verificationCount?: number }).verificationCount ?? 0)
                      : "—",
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
