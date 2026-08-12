import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Building2, FileCheck2, HeartPulse, ShieldCheck, Users } from "lucide-react";

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
  return (
    <AppLayout title="Admin" currentPath="/admin">
      <PageSection className="space-y-6">
        <PageHeader
          title="Platform overview"
          description="Cross-institution statistics and operational health for the verification network."
          crumbs={[{ label: "Admin" }]}
        />

        <Grid cols={4}>
          <StatCard label="Institutions" icon={Building2} hint="Registered issuers" />
          <StatCard label="Certificates" icon={FileCheck2} hint="Across all institutions" />
          <StatCard label="Verifications" icon={ShieldCheck} hint="Lifetime requests" />
          <StatCard label="Active users" icon={Users} hint="Staff accounts" />
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
          <SectionCard title="Verification overview" description="Outcome distribution">
            <div className="space-y-4">
              {["Authentic", "Suspicious", "Invalid", "Inconclusive"].map((label) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{label}</span>
                    <span className="font-mono text-sm text-muted-foreground">—</span>
                  </div>
                  <Progress value={0} className="h-1.5" />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Institution overview" description="Onboarding and status">
            <div className="space-y-4">
              {["Active", "Pending approval", "Suspended"].map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-foreground">{label}</span>
                  <span className="font-mono text-sm text-muted-foreground">—</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <SectionCard
            title="Recent activities"
            description="Latest platform events"
            className="lg:col-span-2"
            bodyClassName="p-0"
          >
            <ActivityFeed emptyDescription="Platform-wide events appear here as institutions issue and verify certificates." />
          </SectionCard>

          <div className="space-y-5">
            <SectionCard title="Audit summary" description="Last 24 hours">
              <div className="space-y-3">
                {["Sign-ins", "Record changes", "Failed attempts", "Exports"].map((label) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="size-3.5" aria-hidden="true" />
                      {label}
                    </span>
                    <span className="font-mono text-sm text-foreground">—</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="System health" description="Service availability">
              <div className="space-y-3">
                {["API", "Document extraction", "Storage", "Verification queue"].map((label) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <HeartPulse className="size-3.5" aria-hidden="true" />
                      {label}
                    </span>
                    <Badge variant="neutral">Awaiting status</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
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
