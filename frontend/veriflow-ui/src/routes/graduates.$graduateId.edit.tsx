import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { GraduateForm, prepareGraduateFormValues } from "@/components/forms/graduate-form";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/common/protected-route";
import { api } from "@/lib/api";

export const Route = createFileRoute("/graduates/$graduateId/edit")({
  component: EditGraduatePage,
  head: () => ({
    meta: [
      { title: "Edit graduate — Verifis" },
      {
        name: "description",
        content: "Correct a graduate's record before re-issuing a certificate.",
      },
      { property: "og:title", content: "Edit graduate — Verifis" },
      {
        property: "og:description",
        content: "Amend a graduate's record and keep issuance in sync.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function EditGraduatePage() {
  const { graduateId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["graduates", "detail", graduateId],
    queryFn: async () => {
      const response = await api.graduates.detail(graduateId);
      return response.data!;
    },
    enabled: Boolean(graduateId),
  });

  const graduate = data?.graduate;
  const initialValues = prepareGraduateFormValues(graduate);

  const displayName = graduate
    ? graduate.fullName ?? `${graduate.firstName} ${graduate.lastName}`
    : "Profile";

  return (
    <ProtectedRoute roles={["SUPER_ADMIN", "INSTITUTION_ADMIN"]}>
      <AppLayout title="Edit graduate" currentPath="/graduates">
        <PageSection className="mx-auto max-w-3xl space-y-6">
          <PageHeader
            title="Edit graduate"
            description="Changes to this record appear in new verifications immediately."
            crumbs={[
              { label: "Graduates", href: "/graduates" },
              { label: displayName, href: `/graduates/${graduateId}` },
              { label: "Edit" },
            ]}
          />
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : (
            <GraduateForm
              heading="Graduate details"
              description="Fields are prefilled from the existing record"
              submitLabel="Save changes"
              mode="edit"
              graduateId={graduateId}
              initialValues={initialValues}
              onSuccessRedirectTo={`/graduates/${graduateId}`}
              onCancel={
                <Button type="button" variant="outline" asChild>
                  <Link to="/graduates/$graduateId" params={{ graduateId }}>
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
