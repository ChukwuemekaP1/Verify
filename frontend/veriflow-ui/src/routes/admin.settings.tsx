import { createFileRoute } from "@tanstack/react-router";
import { Bell, Database, Lock, Server, ShieldCheck } from "lucide-react";

import { FormField } from "@/components/common/form-field";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/settings")({
  component: SystemSettingsPage,
  head: () => ({
    meta: [
      { title: "System settings — Verifis admin" },
      {
        name: "description",
        content:
          "Platform-wide configuration: verification policy, security controls, notifications and service health thresholds.",
      },
      { property: "og:title", content: "System settings — Verifis admin" },
      {
        property: "og:description",
        content: "Configure platform policy, security controls and operational thresholds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const toggleRows = [
  {
    id: "enforce-mfa",
    label: "Require multi-factor authentication",
    hint: "Applies to every institution administrator account.",
  },
  {
    id: "force-rotation",
    label: "Force password rotation on first login",
    hint: "New institution credentials must be changed before access is granted.",
  },
  {
    id: "lock-suspended",
    label: "Block verification for suspended institutions",
    hint: "Certificates issued by suspended institutions return an inconclusive result.",
  },
];

const notificationRows = [
  { id: "notify-onboard", label: "Institution onboarding requests" },
  { id: "notify-suspicious", label: "Suspicious verification spikes" },
  { id: "notify-health", label: "Service health incidents" },
];

function SystemSettingsPage() {
  return (
    <AppLayout title="System settings" currentPath="/admin/settings">
      <PageSection className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="System settings"
          description="Platform-level configuration applied across every tenant."
          crumbs={[{ label: "Admin", href: "/admin" }, { label: "System settings" }]}
        />

        <Tabs defaultValue="platform">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="platform" className="flex-1 sm:flex-none">
              Platform
            </TabsTrigger>
            <TabsTrigger value="security" className="flex-1 sm:flex-none">
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1 sm:flex-none">
              Notifications
            </TabsTrigger>
            <TabsTrigger value="services" className="flex-1 sm:flex-none">
              Services
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="mt-5">
            <SectionCard
              title="Verification policy"
              description="Defaults applied to every verification request"
              footer={
                <div className="flex justify-end">
                  <Button size="sm" type="submit" form="platform-settings">
                    Save changes
                  </Button>
                </div>
              }
            >
              <form
                id="platform-settings"
                className="space-y-6"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    id="confidence-threshold"
                    label="Authentic confidence threshold"
                    hint="Minimum extraction confidence required for an authentic result."
                  >
                    <Input id="confidence-threshold" inputMode="numeric" placeholder="—" />
                  </FormField>
                  <FormField
                    id="suspicious-threshold"
                    label="Suspicious confidence threshold"
                    hint="Below this value results are flagged for manual review."
                  >
                    <Input id="suspicious-threshold" inputMode="numeric" placeholder="—" />
                  </FormField>
                  <FormField id="retention" label="Verification record retention">
                    <Select>
                      <SelectTrigger id="retention">
                        <SelectValue placeholder="Select retention period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12m">12 months</SelectItem>
                        <SelectItem value="24m">24 months</SelectItem>
                        <SelectItem value="60m">5 years</SelectItem>
                        <SelectItem value="forever">Indefinite</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField
                    id="rate-limit"
                    label="Public verification rate limit"
                    hint="Requests per IP address, per hour."
                  >
                    <Input id="rate-limit" inputMode="numeric" placeholder="—" />
                  </FormField>
                </div>
              </form>
            </SectionCard>
          </TabsContent>

          <TabsContent value="security" className="mt-5 space-y-5">
            <SectionCard title="Security controls" description="Applies to all tenants">
              <ul className="divide-y divide-border">
                {toggleRows.map((row) => (
                  <li key={row.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{row.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.hint}</p>
                    </div>
                    <Switch aria-label={row.label} />
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Session policy" description="Administrator sessions">
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField id="session-timeout" label="Idle session timeout (minutes)">
                  <Input id="session-timeout" inputMode="numeric" placeholder="—" />
                </FormField>
                <FormField id="max-attempts" label="Failed sign-in lockout threshold">
                  <Input id="max-attempts" inputMode="numeric" placeholder="—" />
                </FormField>
              </div>
              <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="size-3.5" aria-hidden="true" />
                Values load from platform configuration once the service is connected.
              </p>
            </SectionCard>
          </TabsContent>

          <TabsContent value="notifications" className="mt-5">
            <SectionCard title="Platform notifications" description="Routed to super administrators">
              <ul className="divide-y divide-border">
                {notificationRows.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <Bell className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {row.label}
                    </span>
                    <Switch aria-label={row.label} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          </TabsContent>

          <TabsContent value="services" className="mt-5">
            <SectionCard title="Service configuration" description="Connected platform services">
              <ul className="divide-y divide-border">
                {[
                  { label: "Verification API", icon: Server },
                  { label: "Document extraction", icon: ShieldCheck },
                  { label: "Object storage", icon: Database },
                ].map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <row.icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {row.label}
                    </span>
                    <Badge variant="neutral">Awaiting status</Badge>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </PageSection>
    </AppLayout>
  );
}
