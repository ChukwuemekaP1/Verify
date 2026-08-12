import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { PaginationBar } from "@/components/common/pagination-bar";
import { ProtectedRoute } from "@/components/common/protected-route";
import { SearchBar } from "@/components/common/search-bar";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Institution, InstitutionStatus, PaginatedResponse } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/http-client";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

export const Route = createFileRoute("/admin/institutions/")({
  component: InstitutionsPage,
  head: () => ({
    meta: [
      { title: "Institution management — Verifis" },
      {
        name: "description",
        content: "Review, search and manage accredited institutions issuing verifiable certificates.",
      },
      { property: "og:title", content: "Institution management — Verifis" },
      {
        property: "og:description",
        content: "Manage accredited issuing institutions on the verification network.",
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

function InstitutionsContent() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const limit = 20;

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, limit };
    if (query) p['search'] = query;
    if (status) p['status'] = status;
    if (country) p['country'] = country;
    return p;
  }, [page, query, status, country]);

  const { data, isLoading, isError, refetch } = useQuery<PaginatedResponse<Institution>>({
    queryKey: ["institutions", "list", params],
    queryFn: async () => {
      const response = await api.institutions.list(params);
      return response.data!;
    },
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: async (institutionId: string) => {
      const response = await api.institutions.remove(institutionId);
      return response.data!;
    },
    onSuccess: (result) => {
      toast.success(`Institution "${result.name}" deleted`);
      void queryClient.invalidateQueries({ queryKey: ["institutions"] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Failed to delete institution";
      toast.error(message);
    },
  });

  function openDeleteConfirm(institutionId: string) {
    setDeletingId(institutionId);
    setDeleteConfirmOpen(true);
  }

  async function handleDeleteConfirm() {
    if (deletingId) {
      await deleteMutation.mutateAsync(deletingId);
    }
    setDeleteConfirmOpen(false);
    setDeletingId(null);
  }

  const pageCount = data?.pageCount ?? 1;
  const items = data?.items ?? [];
  const isEmpty = !isLoading && items.length === 0;

  return (
    <AppLayout
      title="Institutions"
      currentPath="/admin/institutions"
      actions={
        <Button size="sm" asChild>
          <Link to="/admin/institutions/new">
            <Plus aria-hidden="true" />
            Create institution
          </Link>
        </Button>
      }
    >
      <PageSection className="space-y-6">
        <PageHeader
          title="Institutions"
          description="Accredited bodies authorised to issue and confirm certificates."
          crumbs={[{ label: "Admin", href: "/admin" }, { label: "Institutions" }]}
        />

        <DataTable
          columns={[
            { id: "institution", header: "Institution" },
            { id: "reference", header: "Accreditation ref." },
            { id: "country", header: "Country" },
            { id: "certificates", header: "Certificates", align: "right" },
            { id: "status", header: "Status" },
            { id: "actions", header: "Actions", align: "right" },
          ]}
          caption="Registered institutions"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          isEmpty={isEmpty}
          emptyTitle="No institutions registered"
          emptyDescription="Create an institution to allow it to issue and confirm certificates."
          emptyAction={
            <Button size="sm" asChild>
              <Link to="/admin/institutions/new">
                <Plus aria-hidden="true" />
                Create institution
              </Link>
            </Button>
          }
          toolbar={
            <div>
              <div className="border-b border-border px-4 py-3">
                <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search by institution name or accreditation reference…"
                label="Search institutions"
              />
              </div>
              <FilterBar
                filters={[
                  {
                    id: "status",
                    label: "Status",
                    value: status,
                    onChange: (value) => {
                      setStatus(value === "all" ? "" : value);
                      setPage(1);
                    },
                    options: [
                      { label: "All statuses", value: "all" },
                      { label: "Active", value: "ACTIVE" },
                      { label: "Pending approval", value: "PENDING" },
                      { label: "Suspended", value: "SUSPENDED" },
                      { label: "Inactive", value: "INACTIVE" },
                    ],
                  },
                  {
                    id: "country",
                    label: "Country",
                    value: country,
                    onChange: (value) => {
                      setCountry(value === "all" ? "" : value);
                      setPage(1);
                    },
                    options: [
                      { label: "All countries", value: "all" },
                      { label: "Nigeria", value: "Nigeria" },
                      { label: "Ghana", value: "Ghana" },
                      { label: "Kenya", value: "Kenya" },
                      { label: "South Africa", value: "South Africa" },
                      { label: "United Kingdom", value: "United Kingdom" },
                      { label: "United States", value: "United States" },
                    ],
                  },
                ]}
                onReset={() => {
                  setStatus("");
                  setCountry("");
                  setQuery("");
                  setPage(1);
                }}
              />
            </div>
          }
          footer={
            <PaginationBar
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
              summary={`${data?.total ?? 0} institution${data?.total === 1 ? "" : "s"}`}
            />
          }
        >
          {items.map((institution: Institution) => (
            <TableRow key={institution._id}>
              <TableCell>
                <div className="font-medium">{institution.name}</div>
                <div className="text-xs text-muted-foreground">{institution.type}</div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-[0.8125rem] text-muted-foreground">
                  {institution.accreditationRef ?? "—"}
                </span>
              </TableCell>
              <TableCell>{institution.country ?? "—"}</TableCell>
              <TableCell className="text-right text-muted-foreground">0</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[institution.status] ?? "neutral"}>
                  {STATUS_LABEL[institution.status] ?? institution.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    asChild
                    aria-label={`View ${institution.name}`}
                  >
                    <Link to="/admin/institutions/$institutionId" params={{ institutionId: institution._id }}>
                      <Eye aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    asChild
                    aria-label={`Edit ${institution.name}`}
                  >
                    <Link to="/admin/institutions/$institutionId/edit" params={{ institutionId: institution._id }}>
                      <Pencil aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    aria-label={`Delete ${institution.name}`}
                    onClick={() => openDeleteConfirm(institution._id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </PageSection>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        destructive
        title="Delete institution?"
        description="This removes the institution and deactivates its administrators. This action cannot be undone."
        confirmLabel={deleteMutation.isPending ? "Deleting…" : "Delete institution"}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </AppLayout>
  );
}

function InstitutionsPage() {
  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <InstitutionsContent />
    </ProtectedRoute>
  );
}
