import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/common/form-field";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/http-client";

export const Route = createFileRoute("/change-password")({
  component: ChangePasswordPage,
  head: () => ({
    meta: [
      { title: "Set a new password — Verifis" },
      {
        name: "description",
        content:
          "Replace your temporary password before accessing your institution workspace on Verifis.",
      },
      { property: "og:title", content: "Set a new password — Verifis" },
      {
        property: "og:description",
        content: "Set a permanent password to finish activating your Verifis account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

interface ChangePasswordSearch {
  token?: string;
}

const rules = [
  "At least 12 characters",
  "One uppercase and one lowercase letter",
  "One number and one symbol",
  "Not a previously used password",
];

function ChangePasswordPage() {
  const search = useSearch({ from: "/change-password" }) as ChangePasswordSearch;
  const navigate = useNavigate();

  const urlToken = search.token && typeof search.token === "string" ? search.token : "";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState(urlToken);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isResetFlow = !!resetToken;

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!isResetFlow && currentPassword.length < 8) {
      errors.currentPassword = "Current password is required";
    }

    if (newPassword.length < 12) {
      errors.newPassword = "New password must be at least 12 characters";
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = "Must include an uppercase letter";
    } else if (!/[a-z]/.test(newPassword)) {
      errors.newPassword = "Must include a lowercase letter";
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPassword = "Must include a number";
    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
      errors.newPassword = "Must include a special character";
    }

    if (confirmPassword !== newPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (isResetFlow && !resetToken.trim()) {
      errors.resetToken = "Reset token is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isResetFlow) {
        await api.auth.resetPassword({
          token: resetToken,
          newPassword,
          confirmPassword,
        });
        toast.success("Password reset successfully. Please sign in with your new password.");
        await navigate({ to: "/login" });
      } else {
        await api.auth.changePassword({
          currentPassword,
          newPassword,
        });
        toast.success("Password updated successfully");
        await navigate({ to: "/dashboard" });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
        toast.error(error.message);
      } else {
        const message = error instanceof Error ? error.message : "Failed to update password. Please try again.";
        setServerError(message);
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={isResetFlow ? "Set a new password" : "Change your password"}
      description={
        isResetFlow
          ? "Choose a new password to finish resetting your Verifis account access."
          : "Update your account password. Stronger passwords keep your institution records safe."
      }
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        {serverError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </div>
        ) : null}

        {isResetFlow ? (
          <FormField
            id="reset-token"
            label="Reset token"
            required
            error={fieldErrors.resetToken}
          >
            <Input
              id="reset-token"
              type="text"
              value={resetToken}
              onChange={(event) => setResetToken(event.target.value)}
              placeholder="Paste the reset token from your email"
              required
              disabled={isSubmitting || !!urlToken}
              autoComplete="off"
            />
          </FormField>
        ) : (
          <FormField
            id="current-password"
            label="Current password"
            required
            error={fieldErrors.currentPassword}
          >
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </FormField>
        )}

        <FormField
          id="new-password"
          label="New password"
          required
          error={fieldErrors.newPassword}
        >
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </FormField>

        <FormField
          id="confirm-password"
          label="Confirm new password"
          required
          error={fieldErrors.confirmPassword}
        >
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </FormField>

        <div className="rounded-md border border-border bg-surface p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-foreground">
            <ShieldCheck className="size-3.5 text-muted-foreground" aria-hidden="true" />
            Password requirements
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {rules.map((rule) => (
              <li key={rule}>· {rule}</li>
            ))}
          </ul>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Updating password…" : isResetFlow ? "Reset password" : "Update password"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {isResetFlow ? "Remembered your password? " : "Prefer to sign in again? "}
          <Link to="/login" className="focus-ring rounded-sm font-medium text-foreground underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
