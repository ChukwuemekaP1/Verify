import { Bell, LogOut, Menu, Settings, User as UserIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface TopNavProps {
  title?: string | undefined;
  onMenuClick?: (() => void) | undefined;
  actions?: ReactNode | undefined;
  className?: string | undefined;
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.[0] ?? "";
  const second = lastName?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

export function TopNav({ title, onMenuClick, actions, className }: TopNavProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success("Signed out successfully");
      await navigate({ to: "/login" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign out failed";
      toast.error(message);
    } finally {
      setIsLoggingOut(false);
    }
  }

  const initials = user ? getInitials(user.firstName, user.lastName) : "—";
  const fullName = user ? `${user.firstName} ${user.lastName}` : "";
  const roleLabel =
    user?.role === "SUPER_ADMIN"
      ? "Super administrator"
      : user?.role === "INSTITUTION_ADMIN"
        ? "Institution admin"
        : "";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm sm:px-6",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu aria-hidden="true" />
      </Button>

      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</p>

      <div className="flex shrink-0 items-center gap-1.5">
        {actions}
        {isAuthenticated ? (
          <>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell aria-hidden="true" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Open user menu"
                  disabled={isLoggingOut}
                >
                  <Avatar className="size-8">
                    <AvatarImage alt={fullName} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
                    <p className="text-xs font-normal text-muted-foreground truncate">{user?.email}</p>
                    {roleLabel ? (
                      <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-primary mt-0.5">
                        {roleLabel}
                      </p>
                    ) : null}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <UserIcon className="size-4" aria-hidden="true" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="size-4" aria-hidden="true" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  {isLoggingOut ? "Signing out…" : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">—</AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  );
}
