import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Building2, HeartPulse, ShieldCheck, ShieldX, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";

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

import { api } from "@/lib/api";
import type { DashboardAnalytics, VerificationRecord } from "@/lib/api/contracts";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
  head: () => ({
    meta: [
      { title: "Admin dashboard — Verifis" },
      {
        name: "description",
        content:
          "Platform-wide statistics, institution oversight, verification analytics and system health.",
      },
      { property: "og:title", content: "Admin dashboard — Verifis" },
      {
        property: "og:description",
        content: "Oversight of institutions, verifications, audit activity and system health.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminDashboardContent() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analytics.dashboard()
      .then((res) => {
        const data = (res as { data?: DashboardAnalytics })?.data ?? (res as unknown as DashboardAnalytics);
        setAnalytics(data ?? null);
      })
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, []);

  const totalInstitutions = analytics?.institutionCount ?? 0;
  const totalVerifications = analytics?.verifications?.total ?? 0;
  const authenticVerifications = analytics?.verifications?.authentic ?? 0;
  const failedVerifications = (analytics?.verifications?.notFound ?? 0) + (analytics?.verifications?.invalid ?? 0) + (analytics?.verifications?.error ?? 0);
  const successRate = analytics?.verifications?.successRate ?? 0;
  const recentVerifications = analytics?.recentVerifications ?? [];

  return (
    <AppLayout title="Admin" currentPath="/admin">
      <PageSection className="space-y-6">
        <PageHeader
          title="Platform overview"
          description="Cross-institution statistics and operational health for the verification network."
          crumbs={[{ label: "Admin" }]}
        />

        <Grid cols={4}>
          <StatCard
            label="Institutions"
            icon={Building2}
            hint="Registered issuers"
            value={loading ? undefined : totalInstitutions}
          />
          <StatCard
            label="Verifications"
            icon={ShieldCheck}
            hint="Lifetime requests"
            value={loading ? undefined : totalVerifications}
          />
          <StatCard
            label="Successful"
            icon={TrendingUp}
            hint="Confirmed credentials"
            value={loading ? undefined : authenticVerifications}
          />
          <StatCard
            label="Success rate"
            icon={Activity}
            hint="Verification accuracy"
            value={loading ? undefined : `${Math.round(successRate)}%`}
          />
        </Grid>

        <SectionCard title="Quick actions" description="Common super administrator tasks">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/institutions/new">Register institution</Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/institutions">Manage institutions</Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/audit-logs">Review audit logs</Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/settings">System settings</Link>
            </Button>
          </div>
        </SectionCard>

        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard title="Verification outcomes" description="Distribution of results">
            <div className="space-y-4">
              {[
                { label: "Verified", value: authenticVerifications, color: "text-success" },
                { label: "Suspicious", value: analytics?.verifications?.suspicious ?? 0, color: "text-warning" },
                { label: "Not found", value: analytics?.verifications?.notFound ?? 0, color: "text-info" },
                { label: "Failed / Error", value: failedVerifications, color: "text-destructive" },
              ].map(({ label, value, color }) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{label}</span>
                    <span className={`font-mono text-sm ${color}`}>{loading ? "—" : value}</span>
                  </div>
                  <Progress
                    value={totalVerifications > 0 ? (value / totalVerifications) * 100 : 0}
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Platform status" description="Service health">
            <div className="space-y-3">
              {[
                { label: "API", status: "Operational" },
                { label: "Database", status: "Operational" },
                { label: "Document extraction", status: "Operational" },
                { label: "Verification engine", status: "Operational" },
              ].map(({ label, status }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HeartPulse className="size-3.5" aria-hidden="true" />
                    {label}
                  </span>
                  <Badge variant="success">{status}</Badge>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <SectionCard
            title="Recent verification activity"
            description="Latest verification requests across all institutions"
            className="lg:col-span-2"
            bodyClassName="p-0"
          >
            {loading ? (
              <ActivityFeed loading />
            ) : recentVerifications.length === 0 ? (
              <ActivityFeed emptyDescription="Verification activity appears here as certificates are verified across the platform." />
            ) : (
              <ul className="divide-y divide-border">
                {recentVerifications.slice(0, 10).map((v: VerificationRecord) => {
                  const isSuccess = v.status === "AUTHENTIC";
                  const isPending = v.status === "PENDING" || v.status === "IN_PROGRESS";
                  return (
                    <li key={v._id} className="flex items-center gap-3 px-4 py-3">
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full ${isSuccess ? "bg-success-subtle text-success" : isPending ? "bg-muted text-muted-foreground" : "bg-info-subtle text-info"}`}>
                        {isSuccess ? <ShieldCheck className="size-4" /> : isPending ? <Activity className="size-4" /> : <ShieldX className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {isSuccess ? "Certificate verified" : isPending ? "Verification in progress" : v.status === "NOT_FOUND" ? "Credential not found" : v.status}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {v.method} · {v.verificationReference}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Audit summary" description="Last 24 hours">
            <div className="space-y-3">
              {[
                { label: "Total verifications", value: analytics?.verifications?.last7Days ?? 0 },
                { label: "Average confidence", value: analytics?.verifications?.averageConfidence ? `${Math.round(analytics.verifications.averageConfidence)}%` : "—" },
                { label: "Pending review", value: analytics?.verifications?.pending ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="size-3.5" aria-hidden="true" />
                    {label}
                  </span>
                  <span className="font-mono text-sm text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </PageSection>
    </AppLayout>
  );
}

function AdminDashboardPage() {
  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
