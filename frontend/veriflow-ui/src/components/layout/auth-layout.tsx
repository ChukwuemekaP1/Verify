import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";

interface AuthLayoutProps {
  title: string;
  description?: string | undefined;
  children: ReactNode;
  footer?: ReactNode | undefined;
}

/** Centered, quiet layout shared by all authentication screens. */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="px-4 py-6 sm:px-8">
        <Link to="/" className="focus-ring inline-flex rounded-md">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-[26rem]">
          <div className="mb-6">
            <h1 className="text-title text-foreground">{title}</h1>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>

          <div className="surface-panel p-6 shadow-sm sm:p-7">{children}</div>

          {footer ? (
            <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
          ) : null}
        </div>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-muted-foreground sm:px-8">
        Protected workspace · All verification activity is logged.
      </footer>
    </div>
  );
}
