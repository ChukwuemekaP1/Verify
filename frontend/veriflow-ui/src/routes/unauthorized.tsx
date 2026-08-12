import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unauthorized")({
  component: UnauthorizedPage,
  head: () => ({
    meta: [
      { title: "Access denied — Verifis" },
      {
        name: "description",
        content: "You don't have permission to view this area of the Verifis workspace.",
      },
      { property: "og:title", content: "Access denied — Verifis" },
      { property: "og:description", content: "Your account lacks permission for this area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-full bg-warning-subtle text-warning">
          <Lock className="size-5" aria-hidden="true" />
        </div>
        <h1 className="text-title mt-5 text-foreground">Access denied</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your account doesn't have permission to view this area. If you believe this is a mistake,
          contact your workspace administrator.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/">Return home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/login">Switch account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
