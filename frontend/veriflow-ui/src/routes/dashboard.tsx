import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeAlert,
  BadgeCheck,
  BadgeX,
  Clock3,
  FileCheck2,
  FilePlus2,
  GraduationCap,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  UserPlus,
} from "lucide-react";

import { ActivityFeed } from "@/components/common/activity-feed";
import { ProtectedRoute } from "@/components/common/protected-route";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { Grid } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "@/lib/api";
import type { DashboardAnalytics } from "@/lib/api/contracts";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  loader: async () => {
    const res = await api.analytics.dashboard();
    return (res?.data ?? res ?? null) as DashboardAnalytics | null;
  },
  head: () => ({
    meta: [
      { title: "Institution dashboard — Verifis" },
      {
        name: "description",
        content:
          "Overview of certificate issuance, verification requests and recent activity for your institution.",
      },
      { property: "og:title", content: "Institution dashboard — Verifis" },
      {
        property: "og:description",
        content: "Track issuance, verification outcomes and recent activity in one workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const quickActions = [
  { label: "Manage graduates", to: "/graduates", icon: GraduationCap },
  { label: "View certificates", to: "/certificates", icon: FileCheck2 },
  { label: "Add graduate", to: "/graduates/new", icon: UserPlus },
  { label: "Verification history", to: "/verifications", icon: ShieldCheck },
] as const;

function DashboardContent() {
  const analytics = Route.useLoaderData();

  const graduateTotal = analytics?.graduates.total ?? 0;
  const graduateActive = analytics?.graduates.active ?? 0;
  const certTotal = analytics?.certificates.total ?? 0;
  const certPublished = analytics?.certificates.published ?? 0;
  const verifTotal = analytics?.verifications.total ?? 0;
  const verifLast7 = analytics?.verifications.last7Days ?? 0;
  const certPending = analytics?.certificates.pendingReview ?? 0;

  const authentic = analytics?.verifications.authentic ?? 0;
  const suspicious = analytics?.verifications.suspicious ?? 0;
  const invalid = analytics?.verifications.invalid ?? 0;
  const notFound = analytics?.verifications.notFound ?? 0;
  const error = analytics?.verifications.error ?? 0;
  const denom = authentic + suspicious + invalid + notFound + error || 1;
  const authenticPct = Math.round((authentic / denom) * 100);
  const suspiciousPct = Math.round((suspicious / denom) * 100);
  const invalidPct = Math.round(((invalid + notFound + error) / denom) * 100);

  const hasAnalytics = !!analytics;

  return (
    <AppLayout
      title="Dashboard"
      currentPath="/dashboard"
      actions={
        <Button size="sm" asChild>
          <Link to="/certificates/upload">Upload certificate</Link>
        </Button>
      }
    >
      <PageSection className="space-y-6">
        <PageHeader
          title="Overview"
          description="A live summary of your institution's credential records and verification traffic."
          badge={
            analytics?.scope?.institutionId ? (
              <Badge variant="neutral">Scoped to institution</Badge>
            ) : analytics?.scope?.isSuperAdmin ? (
              <Badge variant="neutral">Super administrator view</Badge>
            ) : undefined
          }
        />

        <Grid cols={4}>
          <StatCard
            label="Graduates"
            icon={GraduationCap}
            hint="Registered in your institution"
            value={hasAnalytics ? graduateTotal : undefined}
            subHint={hasAnalytics ? `${graduateActive} active` : undefined}
          />
          <StatCard
            label="Certificates"
            icon={FileCheck2}
            hint="Issued and published"
            value={hasAnalytics ? certTotal : undefined}
            subHint={hasAnalytics ? `${certPublished} published` : undefined}
          />
          <StatCard
            label="Verifications"
            icon={BadgeCheck}
            hint="Requests received"
            value={hasAnalytics ? verifTotal : undefined}
            subHint={hasAnalytics ? `${verifLast7} last 7 days` : undefined}
          />
          <StatCard
            label="Pending review"
            icon={Clock3}
            hint="Awaiting confirmation"
            value={hasAnalytics ? certPending : undefined}
            subHint={
              analytics?.verifications.pending
                ? `${analytics.verifications.pending} pending reviews`
                : undefined
            }
          />
        </Grid>

        <div className="grid gap-5 lg:grid-cols-3">
          <SectionCard
            title="Recent activity"
            description="Latest issuance and verification events"
            className="lg:col-span-2"
            bodyClassName="p-0"
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link to="/verifications">View all activity</Link>
              </Button>
            }
          >
            <ActivityFeed
              loading={!hasAnalytics}
              isEmpty={(analytics?.recentVerifications ?? []).length === 0}
            >
              {(analytics?.recentVerifications ?? []).map((v) => {
                const isAuthentic = v.status === "AUTHENTIC";
                const isSuspicious = v.status === "SUSPICIOUS";
                const Icon = isAuthentic
                  ? ShieldCheck
                  : isSuspicious
                    ? ShieldAlert
                    : v.status === "PENDING" || v.status === "IN_PROGRESS"
                      ? Clock3
                      : ShieldX;
                const tone = isAuthentic
                  ? "success"
                  : isSuspicious
                    ? "warning"
                    : v.status === "PENDING" || v.status === "IN_PROGRESS"
                      ? "neutral"
                      : "danger";
                const when = v.verifiedAt ?? v.createdAt ?? undefined;
                return (
                  <li key={v.id ?? v._id ?? String(v.reference ?? Math.random())} className="flex items-start gap-3 px-5 py-3.5">
                    <div
                      className={[
                        "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                        tone === "success"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                          : tone === "warning"
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
                            : tone === "neutral"
                              ? "border-slate-500/20 bg-slate-500/10 text-slate-600"
                              : "border-rose-500/20 bg-rose-500/10 text-rose-600",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {v.certificateNumber ?? v.graduateName ?? v.reference ?? "Verification"}
                        </p>
                        <Badge variant={tone as "success" | "warning" | "danger" | "neutral"}>
                          {v.status}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {(v.method ? `${v.method} · ` : "") +
                          (v.confidenceScore != null
                            ? `${Math.round(v.confidenceScore)}% confidence · `
                            : "") +
                          (v.institutionName ?? v.scope ?? "")}
                      </p>
                      {when ? (
                        <p className="text-[11px] text-muted-foreground/80">
                          {new Date(when).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ActivityFeed>
          </SectionCard>

          <SectionCard title="Quick actions" description="Common tasks">
            <ul className="space-y-2">
              {quickActions.map((action) => (
                <li key={action.to}>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to={action.to}>
                      <action.icon aria-hidden="true" />
                      {action.label}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <SectionCard
          title="Verification summary"
          description="Distribution of outcomes across received requests"
        >
          {!hasAnalytics ? (
            <div className="grid gap-5 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-10 rounded" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                {
                  label: "Authentic",
                  count: authentic,
                  pct: authenticPct,
                  tone: "text-success",
                  icon: BadgeCheck,
                },
                {
                  label: "Suspicious",
                  count: suspicious,
                  pct: suspiciousPct,
                  tone: "text-warning",
                  icon: ShieldAlert,
                },
                {
                  label: "Invalid / Not found",
                  count: invalid + notFound + error,
                  pct: invalidPct,
                  tone: "text-destructive",
                  icon: ShieldX,
                },
              ].map((row) => (
                <div key={row.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <row.icon className={`size-4 ${row.tone}`} aria-hidden="true" />
                      {row.label}
                    </span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {row.count} ({row.pct}%)
                    </span>
                  </div>
                  <Progress value={row.pct} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            Success rate: {hasAnalytics ? `${Math.round(analytics.verifications.successRate)}%` : "—"}
            {" · "}
            Avg. confidence:{" "}
            {hasAnalytics ? `${Math.round(analytics.verifications.averageConfidence)}%` : "—"}
          </p>
        </SectionCard>
      </PageSection>
    </AppLayout>
  );
}

function DashboardPage() {
  return (
    <ProtectedRoute roles={["SUPER_ADMIN", "INSTITUTION_ADMIN"]}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
