"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { LoginRequest } from "@staq/shared";
import { SignInForm } from "@/components/organisms";
import { useLogin } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function LoginPage() {
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
