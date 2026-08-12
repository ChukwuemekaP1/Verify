import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/layout/auth-layout";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/http-client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset password — Verifis" },
      {
        name: "description",
        content: "Request a password reset link for your Verifis certificate verification account.",
      },
      { property: "og:title", content: "Reset password — Verifis" },
      { property: "og:description", content: "Request a password reset link for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await api.auth.forgotPassword({ email });
      setSubmitted(true);
      const debugToken = response?.data?.debug_token;
      if (debugToken) {
        toast.message(
          <div>
            <p className="font-medium">Reset token (dev only):</p>
            <code className="mt-1 block rounded bg-muted p-2 text-xs font-mono break-all">{debugToken}</code>
          </div>,
          { duration: 30000 },
        );
      } else {
        toast.success(response?.data?.message ?? "Reset instructions sent if the email is registered.");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
        toast.error(error.message);
      } else {
        const message = error instanceof Error ? error.message : "Failed to request reset. Please try again.";
        setServerError(message);
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout
        title="Check your email"
        description="If an account exists with that email, we've sent instructions to reset your password."
        footer={
          <Link
            to="/login"
            className="focus-ring inline-flex items-center gap-1.5 rounded-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Reset request submitted</p>
              <p className="text-sm text-muted-foreground">
                Password reset links expire after 1 hour. Check your inbox and spam folder.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSubmitted(false);
              setEmail("");
            }}
          >
            Use a different email
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email associated with your account and we'll send reset instructions."
      footer={
        <Link
          to="/login"
          className="focus-ring inline-flex items-center gap-1.5 rounded-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to sign in
        </Link>
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

        <FormField id="reset-email" label="Work email" required>
          <Input
            id="reset-email"
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

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
