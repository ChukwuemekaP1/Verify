import { createFileRoute, Link } from "@tanstack/react-router";

import {
  InstitutionForm,
} from "@/components/forms/institution-form";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/common/protected-route";

export const Route = createFileRoute("/admin/institutions/new")({
  component: CreateInstitutionPage,
  head: () => ({
    meta: [
      { title: "Create institution — Verifis" },
      {
        name: "description",
        content: "Register an accredited institution so it can issue verifiable certificates.",
      },
      { property: "og:title", content: "Create institution — Verifis" },
      {
        property: "og:description",
        content: "Add a new issuing institution to the verification network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CreateInstitutionPage() {
  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <AppLayout title="Create institution" currentPath="/admin/institutions">
        <PageSection className="mx-auto max-w-3xl space-y-6">
          <PageHeader
            title="Create institution"
            description="Provide accreditation details and a primary contact for the issuing body."
            crumbs={[{ label: "Institutions", href: "/admin/institutions" }, { label: "Create" }]}
          />
          <InstitutionForm
            heading="Institution details"
            description="Accreditation is confirmed before issuing is enabled"
            submitLabel="Create institution"
            mode="create"
            onSuccessRedirectTo="/admin/institutions"
            onCancel={
              <Button type="button" variant="outline" asChild>
                <Link to="/admin/institutions">Cancel</Link>
              </Button>
            }
          />
        </PageSection>
      </AppLayout>
    </ProtectedRoute>
  );
}
