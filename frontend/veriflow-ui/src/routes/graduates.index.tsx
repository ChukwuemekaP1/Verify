import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
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
import type { Graduate, GraduateStatus, GraduateLevel, PaginatedResponse } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/http-client";

export const Route = createFileRoute("/graduates/")({
  component: GraduatesPage,
  head: () => ({
    meta: [
      { title: "Graduate management — Verifis" },
      {
        name: "description",
        content:
          "Search, filter and manage graduate records that back your institution's issued certificates.",
      },
      { property: "og:title", content: "Graduate management — Verifis" },
      {
        property: "og:description",
        content: "Manage graduate records used for certificate issuance and verification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUS_VARIANT: Record<GraduateStatus, "success" | "neutral"> = {
  ACTIVE: "success",
  ARCHIVED: "neutral",
};

const STATUS_LABEL: Record<GraduateStatus, string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

const LEVEL_LABEL: Record<GraduateLevel, string> = {
  DIPLOMA: "Diploma",
  UNDERGRADUATE: "Undergraduate",
  POSTGRADUATE: "Postgraduate",
  DOCTORATE: "Doctorate",
};

const columns = [
  { id: "name", header: "Graduate" },
  { id: "matric", header: "Matriculation no." },
  { id: "programme", header: "Programme" },
  { id: "year", header: "Graduation year" },
  { id: "status", header: "Status" },
  { id: "actions", header: "Actions", align: "right" as const },
];

function GraduatesContent() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [programme, setProgramme] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const limit = 20;

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, limit };
    if (query) p['search'] = query;
    if (programme && programme !== "all") p['level'] = programme;
    if (year) p['graduationYear'] = year;
    if (status && status !== "all") p['status'] = status;
    return p;
  }, [page, query, programme, year, status]);

  const { data, isLoading, isError, refetch } = useQuery<PaginatedResponse<Graduate>>({
    queryKey: ["graduates", "list", params],
    queryFn: async () => {
      const response = await api.graduates.list(params);
      return response.data!;
    },
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: async (graduateId: string) => {
      const response = await api.graduates.remove(graduateId);
      return response.data!;
    },
    onSuccess: (result) => {
      toast.success(`Graduate "${result.fullName || result.matricNumber}" deleted`);
      void queryClient.invalidateQueries({ queryKey: ["graduates"] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Failed to delete graduate record";
      toast.error(message);
    },
  });

  function openDeleteConfirm(graduateId: string) {
    setDeletingId(graduateId);
    setConfirmOpen(true);
  }

  async function handleDeleteConfirm() {
    if (deletingId) {
      await deleteMutation.mutateAsync(deletingId);
    }
    setConfirmOpen(false);
    setDeletingId(null);
  }

  const pageCount = data?.pageCount ?? 1;
  const items = data?.items ?? [];
  const isEmpty = !isLoading && items.length === 0;

  return (
    <AppLayout
      title="Graduates"
      currentPath="/graduates"
      actions={
        <Button size="sm" asChild>
          <Link to="/graduates/new">
            <Plus aria-hidden="true" />
            Add graduate
          </Link>
        </Button>
      }
    >
      <PageSection className="space-y-6">
        <PageHeader
          title="Graduate management"
          description="Records here are the source of truth for certificate issuance and verification."
          crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Graduates" }]}
        />

        <DataTable
          columns={columns}
          caption="Graduate records"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          isEmpty={isEmpty}
          emptyTitle="No graduate records"
          emptyDescription="Add graduates individually or import them from your student information system."
          emptyAction={
            <Button size="sm" asChild>
              <Link to="/graduates/new">
                <Plus aria-hidden="true" />
                Add graduate
              </Link>
            </Button>
          }
          toolbar={
            <div className="space-y-0">
              <div className="border-b border-border px-4 py-3">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by name, matriculation number or programme…"
                  label="Search graduates"
                />
              </div>
              <FilterBar
                filters={[
                  {
                    id: "programme",
                    label: "Level",
                    value: programme,
                    onChange: (value) => {
                      setProgramme(value);
                      setPage(1);
                    },
                    options: [
                      { label: "All levels", value: "all" },
                      { label: "Undergraduate", value: "UNDERGRADUATE" },
                      { label: "Postgraduate", value: "POSTGRADUATE" },
                      { label: "Diploma", value: "DIPLOMA" },
                      { label: "Doctorate", value: "DOCTORATE" },
                    ],
                  },
                  {
                    id: "year",
                    label: "Graduation year",
                    value: year,
                    onChange: (value) => {
                      setYear(value === "all" ? "" : value);
                      setPage(1);
                    },
                    options: [
                      { label: "All years", value: "all" },
                      { label: "2025", value: "2025" },
                      { label: "2024", value: "2024" },
                      { label: "2023", value: "2023" },
                      { label: "2022", value: "2022" },
                      { label: "2021", value: "2021" },
                    ],
                  },
                  {
                    id: "status",
                    label: "Status",
                    value: status,
                    onChange: (value) => {
                      setStatus(value);
                      setPage(1);
                    },
                    options: [
                      { label: "All statuses", value: "all" },
                      { label: "Active", value: "ACTIVE" },
                      { label: "Archived", value: "ARCHIVED" },
                    ],
                  },
                ]}
                onReset={() => {
                  setProgramme("");
                  setYear("");
                  setStatus("");
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
              summary={`${data?.total ?? 0} graduate${data?.total === 1 ? "" : "s"}`}
            />
          }
        >
          {items.map((graduate: Graduate) => (
            <TableRow key={graduate._id}>
              <TableCell>
                <div className="font-medium">
                  {graduate.fullName ?? `${graduate.firstName} ${graduate.lastName}`}
                </div>
                {graduate.level ? (
                  <div className="text-xs text-muted-foreground">
                    {LEVEL_LABEL[graduate.level] ?? graduate.level}
                  </div>
                ) : null}
              </TableCell>
              <TableCell>
                <span className="font-mono text-[0.8125rem] text-muted-foreground">
                  {graduate.matricNumber}
                </span>
              </TableCell>
              <TableCell>
                <span className="truncate">{graduate.programme}</span>
              </TableCell>
              <TableCell>{graduate.graduationYear}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[graduate.status] ?? "neutral"}>
                  {STATUS_LABEL[graduate.status] ?? graduate.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    asChild
                    aria-label={`View graduate ${graduate.matricNumber}`}
                  >
                    <Link to="/graduates/$graduateId" params={{ graduateId: graduate._id }}>
                      <Eye aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    asChild
                    aria-label={`Edit graduate ${graduate.matricNumber}`}
                  >
                    <Link to="/graduates/$graduateId/edit" params={{ graduateId: graduate._id }}>
                      <Pencil aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    aria-label={`Delete graduate ${graduate.matricNumber}`}
                    onClick={() => openDeleteConfirm(graduate._id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <GraduationCap className="size-3.5" aria-hidden="true" />
          Rows render once graduate data is returned by the service.
        </p>
      </PageSection>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        title="Delete graduate record?"
        description="This removes the graduate and unlinks any certificates issued to them. This action cannot be undone."
        confirmLabel={deleteMutation.isPending ? "Deleting…" : "Delete graduate"}
        onConfirm={() => void handleDeleteConfirm()}
      >
      </ConfirmDialog>
    </AppLayout>
  );
}

function GraduatesPage() {
  return (
    <ProtectedRoute roles={["SUPER_ADMIN", "INSTITUTION_ADMIN"]}>
      <GraduatesContent />
    </ProtectedRoute>
  );
}
