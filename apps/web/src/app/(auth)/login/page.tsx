"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { LoginRequest } from "@raygan/shared";
import { SignInForm } from "@/components/organisms";
import { useLogin } from "@/lib/api";
import { Paragraph } from "@/components/atoms";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const loginMutation = useLogin();

  const handleSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        router.push(redirectTo);
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

  return (
    <SignInForm
      onSubmit={handleSubmit}
      onGoogleAuth={handleGoogleAuth}
      onGitHubAuth={handleGitHubAuth}
      onForgotPassword={handleForgotPassword}
      isLoading={loginMutation.isPending}
      error={loginMutation.error?.message ?? null}
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
