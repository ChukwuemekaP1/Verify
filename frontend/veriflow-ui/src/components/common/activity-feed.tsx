import { Activity } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ListSkeleton } from "@/components/common/skeletons";

/**
 * Renders activity entries supplied by the backend. With no entries it shows a
 * clean empty state instead of placeholder records.
 */
export function ActivityFeed({
  loading,
  isEmpty = true,
  children,
  emptyTitle = "No recent activity",
  emptyDescription = "Activity will appear here as your team verifies and issues certificates.",
}: {
  loading?: boolean | undefined;
  isEmpty?: boolean | undefined;
  children?: React.ReactNode | undefined;
  emptyTitle?: string | undefined;
  emptyDescription?: string | undefined;
}) {
  if (loading) return <ListSkeleton items={4} />;
  if (isEmpty) {
    return (
      <EmptyState
        icon={Activity}
        title={emptyTitle}
        description={emptyDescription}
        className="py-10"
      />
    );
  }
  return <ul className="divide-y divide-border">{children}</ul>;
}
