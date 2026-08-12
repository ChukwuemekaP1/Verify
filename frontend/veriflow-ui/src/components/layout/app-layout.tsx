import { useState, type ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopNav } from "@/components/layout/top-nav";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  title?: string | undefined;
  currentPath?: string | undefined;
  actions?: ReactNode | undefined;
  withFooter?: boolean | undefined;
}

/** Application shell: responsive sidebar + sticky top nav + content + footer. */
export function AppLayout({
  children,
  title,
  currentPath,
  actions,
  withFooter = true,
}: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border lg:block">
        <SidebarNav currentPath={currentPath} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav currentPath={currentPath} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <TopNav title={title} actions={actions} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1">{children}</main>
        {withFooter ? <Footer /> : null}
      </div>
    </div>
  );
}

export function PageSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return <section className={cn("px-4 py-6 sm:px-6 lg:px-8", className)}>{children}</section>;
}
