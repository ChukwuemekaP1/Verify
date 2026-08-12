import { createFileRoute, Link, useRouter, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/layout/auth-layout";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/http-client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — Verifis Certificate Verification" },
      {
        name: "description",
        content: "Sign in to the Verifis workspace to issue, review and verify academic certificates.",
      },
      { property: "og:title", content: "Sign in — Verifis" },
      { property: "og:description", content: "Access your certificate verification workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

interface LoginSearch {
  redirect?: string;
}

function LoginPage() {
  const search = useSearch({ from: "/login" }) as LoginSearch;
  const router = useRouter();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (isAuthenticated) {
    const redirect = search.redirect && typeof search.redirect === "string"
      ? decodeURIComponent(search.redirect)
      : null;
    const safeRedirect = redirect?.startsWith("/") ? redirect : null;
    router.navigate({ to: safeRedirect ?? "/dashboard" });
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setServerError(null);

    try {
      await login(email, password, remember);
      toast.success("Signed in successfully");

      const redirect = search.redirect && typeof search.redirect === "string"
        ? decodeURIComponent(search.redirect)
        : null;
      const safeRedirect = redirect?.startsWith("/") ? redirect : null;

      if (safeRedirect) {
        await navigate({ to: safeRedirect as never });
      } else {
        await navigate({ to: "/dashboard" });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        const detail = error.details as { remainingAttempts?: number } | undefined;
        if (detail?.remainingAttempts !== undefined) {
          setServerError(`${error.message} (${detail.remainingAttempts} attempt${detail.remainingAttempts === 1 ? "" : "s"} remaining)`);
        } else {
          setServerError(error.message);
        }
        toast.error(error.message);
      } else {
        const message = error instanceof Error ? error.message : "Sign in failed. Please try again.";
        setServerError(message);
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Use your institutional account to access the verification workspace."
      footer={
        <>
          Need an account?{" "}
          <a href="/request-access" className="focus-ring rounded-sm font-medium text-primary hover:underline">
            Request access
          </a>
        </>
      }
    >
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        {serverError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </div>
        ) : null}

        <FormField id="email" label="Work email" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@institution.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id="password" label="Password" required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </FormField>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              name="remember"
              checked={remember}
              onCheckedChange={(checked) => setRemember(checked === true)}
              disabled={isSubmitting}
            />
            <Label htmlFor="remember" className="text-[0.8125rem] font-normal text-muted-foreground">
              Keep me signed in
            </Label>
          </div>
          <Link
            to="/forgot-password"
            className="focus-ring rounded-sm text-[0.8125rem] font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
