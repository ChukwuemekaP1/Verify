import {
  Building2,
  FileCheck2,
  GraduationCap,
  History,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/** Super Administrator navigation — platform-wide scope. */
export const adminNavSections: NavSection[] = [
  {
    label: "Platform",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Management",
    items: [
      { label: "Institutions", href: "/admin/institutions", icon: Building2 },
      { label: "Verification activity", href: "/admin/audit-logs", icon: History },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Audit logs", href: "/admin/audit-logs", icon: ScrollText },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

/** Institution Administrator navigation — scoped to a single institution. */
export const institutionNavSections: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Records",
    items: [
      { label: "Graduates", href: "/graduates", icon: GraduationCap },
      { label: "Certificates", href: "/certificates", icon: FileCheck2 },
    ],
  },
  {
    label: "Verification",
    items: [
      { label: "Verification history", href: "/verifications", icon: History },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Institution profile", href: "/profile", icon: UserCog },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function getNavSections(currentPath?: string | undefined): {
  sections: NavSection[];
  scopeLabel: string;
  scopeIcon: LucideIcon;
} {
  const isAdmin = currentPath?.startsWith("/admin") ?? false;
  return isAdmin
    ? { sections: adminNavSections, scopeLabel: "Super administrator", scopeIcon: ShieldCheck }
    : { sections: institutionNavSections, scopeLabel: "Institution workspace", scopeIcon: Building2 };
}

/** Navigation structure only — no data, no counts. */
export const navSections = institutionNavSections;

export function SidebarNav({
  currentPath,
  onNavigate,
  className,
}: {
  currentPath?: string | undefined;
  onNavigate?: (() => void) | undefined;
  className?: string | undefined;
}) {
  const { sections, scopeLabel, scopeIcon: ScopeIcon } = getNavSections(currentPath);

  return (
    <div className={cn("flex h-full flex-col bg-sidebar", className)}>
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
        <Logo />
      </div>

      <div className="shrink-0 border-b border-sidebar-border px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground">
          <ScopeIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {scopeLabel}
        </p>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="text-eyebrow px-2 pb-2 text-muted-foreground">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = currentPath === item.href;
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "focus-ring flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
        <p className="text-xs text-muted-foreground">Verifis · Multi-tenant credential platform</p>
      </div>
    </div>
  );
}
