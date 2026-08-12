import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, QrCode, Upload } from "lucide-react";
import { useState } from "react";

import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { FilterBar } from "@/components/common/filter-bar";
import { PaginationBar } from "@/components/common/pagination-bar";
import { ProtectedRoute } from "@/components/common/protected-route";
import { QrDisplay } from "@/components/common/qr-display";
import { SearchBar } from "@/components/common/search-bar";
import { SectionCard } from "@/components/common/section-card";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/certificates/")({
  component: CertificatesPage,
  head: () => ({
    meta: [
      { title: "Certificate management — Verifis" },
      {
        name: "description",
        content:
          "Search issued certificates, review verification status and manage QR-backed credential records.",
      },
      { property: "og:title", content: "Certificate management — Verifis" },
      {
        property: "og:description",
        content: "Manage issued academic certificates and their verification status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const statusLegend = [
  { label: "Verified", variant: "success" as const },
  { label: "Pending review", variant: "warning" as const },
  { label: "Processing", variant: "info" as const },
  { label: "Revoked", variant: "danger" as const },
  { label: "Draft", variant: "neutral" as const },
];

function CertificatesContent() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);

  return (
    <AppLayout
      title="Certificates"
      currentPath="/certificates"
      actions={
        <Button size="sm" asChild>
          <Link to="/graduates">
            <GraduationCap aria-hidden="true" />
            Select graduate
          </Link>
        </Button>
      }
    >
      <PageSection className="space-y-6">
        <PageHeader
          title="Certificate management"
          description="Every certificate issued by your institution, with its verification and QR status."
          crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Certificates" }]}
        />

        <div className="flex flex-wrap items-center gap-2">
          {statusLegend.map((item) => (
            <Badge key={item.label} variant={item.variant}>
              {item.label}
            </Badge>
          ))}
        </div>

        <DataTable
          columns={[
            { id: "certificate", header: "Certificate" },
            { id: "graduate", header: "Graduate" },
            { id: "reference", header: "Reference" },
            { id: "issued", header: "Issued" },
            { id: "status", header: "Status" },
            { id: "qr", header: "QR" },
            { id: "actions", header: "Actions", align: "right" },
          ]}
          caption="Issued certificates"
          isEmpty
          emptyTitle="No certificates yet"
          emptyDescription="Select a graduate from the Graduates page to upload and issue their certificate."
          emptyAction={
            <Button size="sm" asChild>
              <Link to="/graduates">
                <GraduationCap aria-hidden="true" />
                Go to graduates
              </Link>
            </Button>
          }
          toolbar={
            <div>
              <div className="border-b border-border px-4 py-3">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by certificate number, graduate or reference…"
                  label="Search certificates"
                />
              </div>
              <FilterBar
                filters={[
                  {
                    id: "status",
                    label: "Status",
                    value: status,
                    onChange: setStatus,
                    options: [
                      { label: "All statuses", value: "all" },
                      { label: "Verified", value: "verified" },
                      { label: "Pending review", value: "pending" },
                      { label: "Processing", value: "processing" },
                      { label: "Revoked", value: "revoked" },
                    ],
                  },
                  {
                    id: "type",
                    label: "Certificate type",
                    value: type,
                    onChange: setType,
                    options: [
                      { label: "All types", value: "all" },
                      { label: "Degree", value: "degree" },
                      { label: "Diploma", value: "diploma" },
                      { label: "Transcript", value: "transcript" },
                    ],
                  },
                ]}
                onReset={() => {
                  setStatus("");
                  setType("");
                  setQuery("");
                }}
              />
            </div>
          }
          footer={
            <PaginationBar page={page} pageCount={1} onPageChange={setPage} summary="No results" />
          }
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <SectionCard
            title="Certificate preview"
            description="Select a certificate to preview its document"
            className="lg:col-span-2"
            bodyClassName="p-0"
          >
            <div className="grid min-h-[18rem] place-items-center">
              <EmptyState
                title="No certificate selected"
                description="Choose a row from the table to preview the source document here."
              />
            </div>
          </SectionCard>

          <SectionCard title="QR status" description="Public verification code" bodyClassName="p-0">
            <QrDisplay className="rounded-none border-0 shadow-none" />
            <div className="flex items-center gap-2 border-t border-border px-4 py-3">
              <QrCode className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <p className="text-xs text-muted-foreground">
                Codes are generated once a certificate is published.
              </p>
            </div>
          </SectionCard>
        </div>
      </PageSection>
    </AppLayout>
  );
}

function CertificatesPage() {
  return (
    <ProtectedRoute roles={["SUPER_ADMIN", "INSTITUTION_ADMIN"]}>
      <CertificatesContent />
    </ProtectedRoute>
  );
}
