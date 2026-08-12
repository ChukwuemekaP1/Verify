import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BadgeCheck, ShieldAlert, ShieldX, TrendingUp } from "lucide-react";

import { DataTable } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { PaginationBar } from "@/components/common/pagination-bar";
import { SearchBar } from "@/components/common/search-bar";
import { StatCard } from "@/components/common/stat-card";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { Grid } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";

import { api } from "@/lib/api";
import type {
  PaginatedResponse,
  VerificationRecord,
} from "@/lib/api/contracts";

export const Route = createFileRoute("/verifications")({
  component: VerificationHistoryPage,
  loader: async () => {
    const res = await api.verifications.list({ page: 1, limit: 20 }).catch(() => null);
    return (res?.data ?? res ?? null) as PaginatedResponse<VerificationRecord> | null;
  },
  head: () => ({
    meta: [
      { title: "Verification history — Verifis" },
      {
        name: "description",
        content:
          "Every verification request received for your institution's certificates, with outcome and confidence.",
      },
      { property: "og:title", content: "Verification history — Verifis" },
      {
        property: "og:description",
        content: "Track verification requests, outcomes and confidence for your certificates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function outcomeTone(status: string) {
  if (status === "AUTHENTIC") return "success";
  if (status === "SUSPICIOUS") return "warning";
  if (status === "PENDING" || status === "IN_PROGRESS") return "neutral";
  return "danger";
}

function VerificationHistoryPage() {
  const loaderData = Route.useLoaderData();
  const items = loaderData?.items ?? [];
  const pageCount = Math.max(1, loaderData?.totalPages ?? 1);
  const total = loaderData?.total ?? items.length;

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const base = { authentic: 0, suspicious: 0, invalid: 0 };
    for (const v of items) {
      if (v.status === "AUTHENTIC") base.authentic += 1;
      else if (v.status === "SUSPICIOUS") base.suspicious += 1;
      else if (v.status === "INVALID" || v.status === "NOT_FOUND" || v.status === "ERROR") base.invalid += 1;
    }
    return base;
  }, [items]);

  return (
    <AppLayout title="Verification history" currentPath="/verifications">
      <PageSection className="space-y-6">
        <PageHeader
          title="Verification history"
          description="Requests received for certificates issued by your institution."
          crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Verification history" }]}
        />

        <Grid cols={4}>
          <StatCard label="Total requests" icon={TrendingUp} hint="All time" value={total || undefined} />
          <StatCard label="Authentic" icon={BadgeCheck} hint="Confirmed matches" value={counts.authentic || undefined} />
          <StatCard label="Suspicious" icon={ShieldAlert} hint="Flagged for review" value={counts.suspicious || undefined} />
          <StatCard label="Invalid" icon={ShieldX} hint="No matching record" value={counts.invalid || undefined} />
        </Grid>

        <DataTable
          columns={[
            { id: "reference", header: "Reference" },
            { id: "certificate", header: "Certificate" },
            { id: "graduate", header: "Graduate" },
            { id: "method", header: "Method" },
            { id: "outcome", header: "Outcome" },
            { id: "confidence", header: "Confidence", align: "right" },
            { id: "requested", header: "Requested", align: "right" },
          ]}
          caption="Verification requests"
          isEmpty={items.length === 0}
          emptyTitle="No verification requests yet"
          emptyDescription="Requests appear here as verifiers check certificates issued by your institution."
          toolbar={
            <div className="space-y-3 border-b border-border p-4">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search by reference, certificate number or graduate"
              />
              <FilterBar
                filters={[
                  {
                    id: "outcome",
                    label: "Outcome",
                    options: [
                      { value: "authentic", label: "Authentic" },
                      { value: "suspicious", label: "Suspicious" },
                      { value: "invalid", label: "Invalid" },
                      { value: "inconclusive", label: "Inconclusive" },
                    ],
                  },
                  {
                    id: "method",
                    label: "Method",
                    options: [
                      { value: "number", label: "Certificate number" },
                      { value: "upload", label: "Document upload" },
                      { value: "qr", label: "QR code" },
                    ],
                  },
                  {
                    id: "period",
                    label: "Period",
                    options: [
                      { value: "24h", label: "Last 24 hours" },
                      { value: "7d", label: "Last 7 days" },
                      { value: "30d", label: "Last 30 days" },
                    ],
                  },
                ]}
              />
            </div>
          }
          footer={<PaginationBar page={page} pageCount={pageCount} onPageChange={setPage} />}
        >
          {items.map((v) => {
            const certNo =
              typeof v.certificate === "object" && v.certificate
                ? v.certificate.certificateNumber
                : String((v.metadata as { certificateNumber?: string } | undefined)?.certificateNumber ?? "—");
            const gradName =
              typeof v.graduate === "object" && v.graduate
                ? [v.graduate.firstName, v.graduate.middleName, v.graduate.lastName].filter(Boolean).join(" ")
                : String((v.metadata as { graduateName?: string } | undefined)?.graduateName ?? "—");
            const ts = v.completedAt ?? v.createdAt;
            return (
              <TableRow key={v._id}>
                <TableCell className="font-mono text-xs">{v.verificationReference}</TableCell>
                <TableCell className="font-mono text-xs">{certNo}</TableCell>
                <TableCell className="max-w-[20ch] truncate text-sm">{gradName}</TableCell>
                <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">{v.method}</TableCell>
                <TableCell>
                  <Badge variant={outcomeTone(v.status) as "success" | "warning" | "danger" | "neutral"}>
                    {v.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {v.confidenceScore != null ? `${Math.round(v.confidenceScore)}%` : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                  {ts ? new Date(ts).toLocaleString() : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </PageSection>
    </AppLayout>
  );
}
