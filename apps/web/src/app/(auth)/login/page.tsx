"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import type { LoginRequest } from "@raygan/shared";
import { ERROR_CODES } from "@raygan/shared";
import { SignInForm } from "@/components/organisms";
import { useLogin, useResendVerification } from "@/lib/api";
import { Button, Heading, Paragraph } from "@/components/atoms";
import { APIError } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function EmailVerificationRequired({ email, onBack }: { email: string; onBack: () => void }) {
  const resendMutation = useResendVerification();
  const [sent, setSent] = useState(false);

  const handleResend = () => {
    resendMutation.mutate(email, {
      onSuccess: () => setSent(true),
    });
  };

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2">
        <Heading level={2} weight="semibold">
          Verify your email
        </Heading>
        <Paragraph variant="muted">
          We sent a verification link to <span className="font-medium text-foreground">{email}</span>.
          Please check your inbox and click the link to continue.
        </Paragraph>
      </div>
      {sent ? (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
          Verification email sent! Check your inbox.
        </div>
      ) : (
        <Button
          onClick={handleResend}
          loading={resendMutation.isPending}
          variant="outline"
          className="w-full"
        >
          Resend verification email
        </Button>
      )}
      {resendMutation.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {resendMutation.error.message}
        </div>
      )}
      <Button variant="ghost" onClick={onBack} className="w-full">
        Back to sign in
      </Button>
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const loginMutation = useLogin();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const handleSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        router.push(redirectTo);
      },
      onError: (error) => {
        if (error instanceof APIError && error.code === ERROR_CODES.EMAIL_NOT_VERIFIED) {
          const email = error.details?.email as string;
          if (email) {
            setUnverifiedEmail(email);
          }
        }
      },
    });
  };

  const handleGoogleAuth = () => {
    const callbackUrl = `${window.location.origin}/callback?redirect=${encodeURIComponent(redirectTo)}`;
    window.location.href = `${API_URL}/api/v1/auth/google?redirect_uri=${encodeURIComponent(callbackUrl)}`;
  };

  const handleGitHubAuth = () => {
    const callbackUrl = `${window.location.origin}/callback?redirect=${encodeURIComponent(redirectTo)}`;
    window.location.href = `${API_URL}/api/v1/auth/github?redirect_uri=${encodeURIComponent(callbackUrl)}`;
  };

  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  if (unverifiedEmail) {
    return (
      <EmailVerificationRequired
        email={unverifiedEmail}
        onBack={() => {
          setUnverifiedEmail(null);
          loginMutation.reset();
        }}
      />
    );
  }

  const errorMessage = loginMutation.error instanceof APIError &&
    loginMutation.error.code === ERROR_CODES.EMAIL_NOT_VERIFIED
    ? null
    : loginMutation.error?.message ?? null;

  return (
    <SignInForm
      onSubmit={handleSubmit}
      onGoogleAuth={handleGoogleAuth}
      onGitHubAuth={handleGitHubAuth}
      onForgotPassword={handleForgotPassword}
      isLoading={loginMutation.isPending}
      error={errorMessage}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <Paragraph variant="muted">Loading...</Paragraph>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
