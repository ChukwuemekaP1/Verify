import { createFileRoute, Link } from "@tanstack/react-router";

import { GraduateForm } from "@/components/forms/graduate-form";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/common/protected-route";

export const Route = createFileRoute("/graduates/new")({
  component: AddGraduatePage,
  head: () => ({
    meta: [
      { title: "Add graduate — Verifis" },
      {
        name: "description",
        content: "Register a new graduate record before issuing an academic certificate.",
      },
      { property: "og:title", content: "Add graduate — Verifis" },
      {
        property: "og:description",
        content: "Create a graduate record for certificate issuance and verification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AddGraduatePage() {
  return (
    <ProtectedRoute roles={["SUPER_ADMIN", "INSTITUTION_ADMIN"]}>
      <AppLayout title="Add graduate" currentPath="/graduates">
        <PageSection className="mx-auto max-w-3xl space-y-6">
          <PageHeader
            title="Add graduate"
            description="Create a graduate record. Certificates can be linked once the record exists."
            crumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Graduates", href: "/graduates" },
              { label: "Add" },
            ]}
          />
          <GraduateForm
            heading="Graduate details"
            description="All required fields must be completed before saving"
            submitLabel="Save graduate"
            mode="create"
            onSuccessRedirectTo="/graduates"
            onCancel={
              <Button type="button" variant="outline" asChild>
                <Link to="/graduates">Cancel</Link>
              </Button>
            }
          />
        </PageSection>
      </AppLayout>
    </ProtectedRoute>
  );
}
