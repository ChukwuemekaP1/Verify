import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Power, ShieldOff } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import { DetailList } from "@/components/common/detail-list";
import { FormField } from "@/components/common/form-field";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { Grid } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProtectedRoute } from "@/components/common/protected-route";
import { api } from "@/lib/api";
import type { InstitutionStatus } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/http-client";

export const Route = createFileRoute("/admin/institutions/$institutionId/")({
  component: ViewInstitutionPage,
  head: () => ({
    meta: [
      { title: "Institution profile — Verifis admin" },
      {
        name: "description",
        content: "Institution accreditation details, issuance volume and verification activity.",
      },
      { property: "og:title", content: "Institution profile — Verifis admin" },
      {
        property: "og:description",
        content: "Accreditation details and verification activity for an issuing institution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUS_VARIANT: Record<InstitutionStatus, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  PENDING: "warning",
  SUSPENDED: "danger",
  INACTIVE: "neutral",
};

const STATUS_LABEL: Record<InstitutionStatus, string> = {
  ACTIVE: "Active",
  PENDING: "Pending approval",
  SUSPENDED: "Suspended",
  INACTIVE: "Inactive",
};

function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return format(new Date(date), "dd MMM yyyy, HH:mm");
  } catch {
    return String(date);
  }
}

function ViewInstitutionPage() {
  const { institutionId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["institutions", "detail", institutionId],
    queryFn: async () => {
      const response = await api.institutions.detail(institutionId);
      return response.data!;
    },
    enabled: Boolean(institutionId),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await api.institutions.updateStatus(institutionId, {
        status,
        reason: suspendReason || undefined,
      });
      return response.data!;
    },
    onSuccess: () => {
      toast.success("Institution status updated");
      void queryClient.invalidateQueries({ queryKey: ["institutions"] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Failed to update status";
      toast.error(message);
    },
  });

  const institution = data?.institution;
  const admin = data?.admin;
  const adminCount = data?.adminCount ?? 0;

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <AppLayout
        title="Institution"
        currentPath="/admin/institutions"
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/institutions/$institutionId/edit" params={{ institutionId }}>
              <Pencil aria-hidden="true" />
              Edit
            </Link>
          </Button>
        }
      >
        <PageSection className="space-y-6">
          <PageHeader
            title={institution?.name ?? "Institution profile"}
            description="Accreditation, contacts and verification activity."
            crumbs={[
              { label: "Admin", href: "/admin" },
              { label: "Institutions", href: "/admin/institutions" },
              { label: "Profile" },
            ]}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  setResetEmail(admin?.email ?? "");
                  setResetOpen(true);
                }}>
                  <KeyRound aria-hidden="true" />
                  Reset password
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActivateOpen(true)}
                  disabled={institution?.status === "ACTIVE"}
                >
                  <Power aria-hidden="true" />
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setSuspendReason("");
                    setSuspendOpen(true);
                  }}
                  disabled={institution?.status === "SUSPENDED" || institution?.status === "INACTIVE"}
                >
                  <ShieldOff aria-hidden="true" />
                  Suspend
                </Button>
              </div>
            }
          />

          <Grid cols={3}>
            <StatCard label="Certificates issued" loading={isLoading} />
            <StatCard label="Verifications received" loading={isLoading} />
            <StatCard
              label="Administrators"
              value={isLoading ? undefined : String(adminCount)}
              loading={isLoading}
            />
          </Grid>

          <SectionCard
            title="Details"
            description="Loaded from the institution record"
          >
            <DetailList
              columns={3}
              loading={isLoading}
              items={[
                { label: "Institution name", value: institution?.name },
                {
                  label: "Accreditation reference",
                  mono: true,
                  value: institution?.accreditationRef,
                },
                { label: "Institution type", value: institution?.type },
                { label: "Country", value: institution?.country },
                { label: "State / Region", value: institution?.state },
                { label: "City", value: institution?.city },
                { label: "Website", value: institution?.website },
                { label: "Contact email", value: institution?.publicContactEmail },
                {
                  label: "Status",
                  value: institution ? (
                    <Badge variant={STATUS_VARIANT[institution.status] ?? "neutral"}>
                      {STATUS_LABEL[institution.status] ?? institution.status}
                    </Badge>
                  ) : undefined,
                },
                {
                  label: "Address",
                  value: institution?.address,
                },
                {
                  label: "Verification prefix",
                  mono: true,
                  value: institution?.verificationPrefix,
                },
                {
                  label: "Onboarded",
                  value: formatDate(institution?.createdAt),
                },
              ]}
            />
          </SectionCard>

          <SectionCard
            title="Administrator account"
            description="Credentials issued by the platform"
          >
            <DetailList
              columns={3}
              loading={isLoading}
              items={[
                {
                  label: "Administrator name",
                  value: admin ? `${admin.firstName} ${admin.lastName}` : undefined,
                },
                { label: "Sign-in email", value: admin?.email },
                {
                  label: "Last sign-in",
                  value: formatDate(admin?.lastLoginAt),
                },
                {
                  label: "Password last changed",
                  value: "—",
                },
                {
                  label: "Multi-factor authentication",
                  value: "Not configured",
                },
                {
                  label: "Account state",
                  value: admin ? (
                    <Badge variant={admin.status === "ACTIVE" ? "success" : "neutral"}>
                      {admin.status}
                    </Badge>
                  ) : undefined,
                },
              ]}
            />
          </SectionCard>

          <DataTable
            columns={[
              { id: "event", header: "Event" },
              { id: "actor", header: "Actor" },
              { id: "reference", header: "Reference" },
              { id: "timestamp", header: "Timestamp", align: "right" },
            ]}
            caption="Institution activity"
            isEmpty
            emptyTitle="No activity recorded"
            emptyDescription="Issuance and verification events for this institution appear here."
          />
        </PageSection>

        <ConfirmDialog
          open={suspendOpen}
          onOpenChange={setSuspendOpen}
          destructive
          title="Suspend this institution?"
          description="Suspension blocks sign-in for the institution administrator and pauses new certificate issuance. Existing certificates remain verifiable."
          confirmLabel={statusMutation.isPending ? "Suspending…" : "Suspend institution"}
          onConfirm={async () => {
            await statusMutation.mutateAsync("SUSPENDED");
            setSuspendOpen(false);
          }}
        >
          <FormField
            id="suspend-reason"
            label="Reason for suspension"
            hint="Recorded in the audit trail and shown to the institution."
            required
          >
            <Input
              id="suspend-reason"
              placeholder="e.g. accreditation under review"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
          </FormField>
        </ConfirmDialog>

        <ConfirmDialog
          open={activateOpen}
          onOpenChange={setActivateOpen}
          title="Activate this institution?"
          description="Sign-in and certificate issuance are restored immediately."
          confirmLabel={statusMutation.isPending ? "Activating…" : "Activate institution"}
          onConfirm={async () => {
            await statusMutation.mutateAsync("ACTIVE");
            setActivateOpen(false);
          }}
        />

        <ConfirmDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          title="Reset institution password?"
          description="A temporary password is issued to the institution's primary contact. They must set a new password on their next sign-in."
          confirmLabel="Reset password"
          onConfirm={() => {
            toast.success(`Temporary password instructions sent to ${resetEmail || admin?.email || "the contact"}`);
            setResetOpen(false);
            void navigate({ to: "/admin/institutions/$institutionId", params: { institutionId } });
          }}
        >
          <FormField
            id="reset-email"
            label="Send temporary password to"
            hint="Defaults to the institution's primary contact email."
          >
            <Input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="—"
            />
          </FormField>
        </ConfirmDialog>
      </AppLayout>
    </ProtectedRoute>
  );
}
