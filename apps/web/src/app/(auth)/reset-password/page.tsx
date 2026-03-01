"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, KeyRound, Loader2 } from "lucide-react";
import { useResetPassword } from "@/lib/api";
import { Button, Heading, Paragraph, InlineBanner } from "@/components/atoms";
import { InputField } from "@/components/molecules";
import { validatePassword } from "@/lib/helpers";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const resetMutation = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    resetMutation.mutate(
      { token, password },
      {
        onSuccess: () => setSuccess(true),
        onError: (err) => setError(err.message),
      }
    );
  };

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <div className="space-y-2">
          <Heading level={2} weight="semibold">
            Password reset successful
          </Heading>
          <Paragraph variant="muted">
            Your password has been updated. You can now sign in with your new password.
          </Paragraph>
        </div>
        <Button onClick={() => router.push("/login")} className="w-full">
          Continue to sign in
        </Button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <KeyRound className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <Heading level={2} weight="semibold">
            Invalid reset link
          </Heading>
          <Paragraph variant="muted">
            This password reset link is invalid or has expired. Please request a new one.
          </Paragraph>
        </div>
        <Button onClick={() => router.push("/forgot-password")} className="w-full">
          Request new link
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Heading level={2} weight="semibold">
          Reset your password
        </Heading>
        <Paragraph variant="muted">Enter your new password below.</Paragraph>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <InlineBanner variant="error" message={error} />}

        <InputField
          label="New password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={resetMutation.isPending}
        />

        <InputField
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={resetMutation.isPending}
        />

        <Button type="submit" className="h-12 w-full rounded-lg" loading={resetMutation.isPending}>
          Reset password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <Paragraph variant="muted">Loading...</Paragraph>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
