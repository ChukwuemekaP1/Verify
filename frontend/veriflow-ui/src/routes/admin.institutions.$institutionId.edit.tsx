import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import {
  InstitutionForm,
  prepareInstitutionFormValues,
} from "@/components/forms/institution-form";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/common/protected-route";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/institutions/$institutionId/edit")({
  component: EditInstitutionPage,
  head: () => ({
    meta: [
      { title: "Edit institution — Verifis" },
      {
        name: "description",
        content: "Update accreditation details, contacts and status for an issuing institution.",
      },
      { property: "og:title", content: "Edit institution — Verifis" },
      {
        property: "og:description",
        content: "Amend an institution's accreditation and contact details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function EditInstitutionPage() {
  const { institutionId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["institutions", "detail", institutionId],
    queryFn: async () => {
      const response = await api.institutions.detail(institutionId);
      return response.data!;
    },
    enabled: Boolean(institutionId),
  });

  const initialValues = prepareInstitutionFormValues(data?.institution);

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <AppLayout title="Edit institution" currentPath="/admin/institutions">
        <PageSection className="mx-auto max-w-3xl space-y-6">
          <PageHeader
            title="Edit institution"
            description="Changes take effect on the next verification response."
            crumbs={[
              { label: "Institutions", href: "/admin/institutions" },
              { label: data?.institution.name ?? "Profile", href: `/admin/institutions/${institutionId}` },
              { label: "Edit" },
            ]}
          />
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : (
            <InstitutionForm
              heading="Institution details"
              description="Fields are prefilled from the existing record"
              submitLabel="Save changes"
              mode="edit"
              institutionId={institutionId}
              initialValues={initialValues}
              onSuccessRedirectTo={`/admin/institutions/${institutionId}`}
              onCancel={
                <Button type="button" variant="outline" asChild>
                  <Link to="/admin/institutions/$institutionId" params={{ institutionId }}>
                    Cancel
                  </Link>
                </Button>
              }
            />
          )}
        </PageSection>
      </AppLayout>
    </ProtectedRoute>
  );
}
