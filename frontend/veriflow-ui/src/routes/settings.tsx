import { createFileRoute } from "@tanstack/react-router";
import { Monitor, Moon, Sun } from "lucide-react";

import { FormField } from "@/components/common/form-field";
import { SectionCard } from "@/components/common/section-card";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Verifis" },
      {
        name: "description",
        content:
          "Security controls, notification preferences and account options for your Verifis workspace.",
      },
      { property: "og:title", content: "Settings — Verifis" },
      {
        property: "og:description",
        content: "Manage security, notifications and account preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ToggleRow({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {title}
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} className="shrink-0" />
    </div>
  );
}

function SettingsPage() {
  return (
    <AppLayout title="Settings" currentPath="/settings">
      <PageSection className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Settings"
          description="Control security, notifications and how your workspace behaves."
          crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
        />

        <SectionCard title="Security" description="Protect your account and workspace">
          <div className="divide-y divide-border">
            <ToggleRow
              id="mfa"
              title="Two-factor authentication"
              description="Require a one-time code in addition to your password."
            />
            <ToggleRow
              id="session-alerts"
              title="New sign-in alerts"
              description="Email me when a new device signs in to this account."
            />
            <ToggleRow
              id="ip-allowlist"
              title="Restrict access by IP"
              description="Only allow sign-ins from your institution's network ranges."
            />
          </div>
          <Separator className="my-5" />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="session-timeout"
              label="Session timeout"
              hint="Signed-out automatically after inactivity"
            >
              <Select>
                <SelectTrigger id="session-timeout">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="allowlist" label="Allowed IP ranges" hint="Comma separated CIDR blocks">
              <Input id="allowlist" className="font-mono" placeholder="0.0.0.0/0" />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Notifications" description="Choose what we email you about">
          <div className="divide-y divide-border">
            <ToggleRow
              id="notify-verification"
              title="Verification requests"
              description="When an employer requests verification of one of your certificates."
            />
            <ToggleRow
              id="notify-suspicious"
              title="Suspicious results"
              description="When a verification returns a suspicious or invalid outcome."
            />
            <ToggleRow
              id="notify-uploads"
              title="Upload processing"
              description="When document extraction completes or fails."
            />
            <ToggleRow
              id="notify-digest"
              title="Weekly digest"
              description="A summary of issuance and verification activity."
            />
          </div>
        </SectionCard>

        <SectionCard title="Account preferences" description="Regional and workspace defaults">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="language" label="Language">
              <Select>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="timezone" label="Time zone">
              <Select>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select time zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="wat">West Africa Time</SelectItem>
                  <SelectItem value="cet">Central European Time</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="date-format" label="Date format">
              <Select>
                <SelectTrigger id="date-format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="iso">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="default-landing" label="Default landing page">
              <Select>
                <SelectTrigger id="default-landing">
                  <SelectValue placeholder="Select page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="certificates">Certificates</SelectItem>
                  <SelectItem value="graduates">Graduates</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Appearance" description="Theme support arrives in a later release">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Light", icon: Sun },
              { label: "Dark", icon: Moon },
              { label: "System", icon: Monitor },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                disabled
                className="focus-ring flex items-center gap-2.5 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted-foreground disabled:opacity-70"
              >
                <option.icon className="size-4" aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <Button>Save settings</Button>
        </div>
      </PageSection>
    </AppLayout>
  );
}
