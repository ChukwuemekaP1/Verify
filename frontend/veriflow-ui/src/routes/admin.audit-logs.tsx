import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";

import { DataTable } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { PaginationBar } from "@/components/common/pagination-bar";
import { SearchBar } from "@/components/common/search-bar";
import { AppLayout, PageSection } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

import { api } from "@/lib/api";
import type { AuditLog, PaginatedResponse } from "@/lib/api/contracts";

export const Route = createFileRoute("/admin/audit-logs")({
  component: AuditLogsPage,
  loader: async () => {
    const [logsRes, statsRes] = await Promise.all([
      api.auditLogs.list({ page: 1, limit: 20 }).catch(() => null),
      api.auditLogs.stats().catch(() => null),
    ]);
    const logs = (logsRes?.data ?? logsRes ?? null) as PaginatedResponse<AuditLog> | null;
    const stats = (statsRes?.data ?? statsRes ?? null) as object | null;
    return { logs, stats };
  },
  head: () => ({
    meta: [
      { title: "Audit logs — Verifis" },
      {
        name: "description",
        content:
          "Searchable, filterable audit trail of every sign-in, record change and verification event.",
      },
      { property: "og:title", content: "Audit logs — Verifis" },
      {
        property: "og:description",
        content: "Complete audit trail of account, record and verification activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function severityTone(severity: string) {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "warning";
    case "LOW":
    case "INFO":
    default:
      return "neutral";
  }
}

function AuditLogsPage() {
  const { logs, stats } = Route.useLoaderData();
  const items = logs?.items ?? [];
  const total = logs?.total ?? items.length;
  const pageCount = Math.max(1, logs?.totalPages ?? 1);

  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [range, setRange] = useState("");
  const [page, setPage] = useState(1);

  return (
    <AppLayout
      title="Audit logs"
      currentPath="/admin/audit-logs"
      actions={
        <Button size="sm" variant="outline">
          <Download aria-hidden="true" />
          Export
        </Button>
      }
    >
      <PageSection className="space-y-6">
        <PageHeader
          title="Audit logs"
          description="An immutable record of activity across accounts, certificates and verifications."
          crumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit logs" }]}
        />

        {stats ? (
          <div className="text-xs text-muted-foreground">
            Total {String(total)} entries · stats snapshot attached
          </div>
        ) : null}

        <DataTable
          columns={[
            { id: "timestamp", header: "Timestamp" },
            { id: "actor", header: "Actor" },
            { id: "action", header: "Action" },
            { id: "resource", header: "Resource" },
            { id: "ip", header: "IP address" },
            { id: "outcome", header: "Outcome", align: "right" },
          ]}
          caption="Audit log entries"
          isEmpty={items.length === 0}
          emptyTitle="No audit entries"
          emptyDescription="Entries are written automatically as users sign in and records change."
          toolbar={
            <div>
              <div className="border-b border-border px-4 py-3">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by actor, action or resource reference…"
                  label="Search audit logs"
                />
              </div>
              <FilterBar
                filters={[
                  {
                    id: "action",
                    label: "Action",
                    value: action,
                    onChange: setAction,
                    options: [
                      { label: "All actions", value: "all" },
                      { label: "Sign in", value: "sign-in" },
                      { label: "Record created", value: "created" },
                      { label: "Record updated", value: "updated" },
                      { label: "Record deleted", value: "deleted" },
                      { label: "Verification", value: "verification" },
                    ],
                  },
                  {
                    id: "actor",
                    label: "Actor type",
                    value: actor,
                    onChange: setActor,
                    options: [
                      { label: "All actors", value: "all" },
                      { label: "Institution staff", value: "staff" },
                      { label: "Administrator", value: "admin" },
                      { label: "Public verifier", value: "public" },
                    ],
                  },
                  {
                    id: "range",
                    label: "Date range",
                    value: range,
                    onChange: setRange,
                    options: [
                      { label: "All time", value: "all" },
                      { label: "Last 24 hours", value: "24h" },
                      { label: "Last 7 days", value: "7d" },
                      { label: "Last 30 days", value: "30d" },
                    ],
                  },
                ]}
                onReset={() => {
                  setAction("");
                  setActor("");
                  setRange("");
                  setQuery("");
                }}
              />
            </div>
          }
          footer={
            <PaginationBar
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
              summary={`${String(total)} ${total === 1 ? "entry" : "entries"}`}
            />
          }
        >
          {items.map((l) => {
            const actorLabel =
              l.actorLabel ??
              (typeof l.actor === "object" && l.actor
                ? [l.actor.firstName, l.actor.lastName].filter(Boolean).join(" ") ||
                  (l.actor as { email?: string }).email
                : String(l.actor ?? "—"));
            const resource =
              l.entityType && l.entityLabel
                ? `${l.entityType} · ${l.entityLabel}`
                : l.entityType ?? "—";
            return (
              <TableRow key={l._id}>
                <TableCell className="tabular-nums text-xs text-muted-foreground">
                  {new Date(l.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="max-w-[22ch] truncate text-sm">{actorLabel}</TableCell>
                <TableCell className="text-sm font-medium text-foreground">{l.action}</TableCell>
                <TableCell className="max-w-[28ch] truncate text-xs text-muted-foreground">
                  {resource}
                </TableCell>
                <TableCell className="font-mono text-xs">{l.ipAddress ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Badge variant={l.success ? "success" : "danger"}>
                      {l.success ? "Success" : "Failed"}
                    </Badge>
                    <Badge variant={severityTone(l.severity) as "success" | "warning" | "danger" | "neutral"}>
                      {l.severity}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </PageSection>
    </AppLayout>
  );
}
