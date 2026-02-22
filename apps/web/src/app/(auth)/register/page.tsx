"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { RegisterRequest } from "@staq/shared";
import { SignUpForm } from "@/components/organisms";
import { useRegister } from "@/lib/api";
import { Paragraph } from "@/components/atoms";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const registerMutation = useRegister();

  const handleSubmit = (data: RegisterRequest) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        const verifyUrl = `/verify-email?email=${encodeURIComponent(data.email)}&redirect=${encodeURIComponent(redirectTo)}`;
        router.push(verifyUrl);
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

  return (
    <SignUpForm
      onSubmit={handleSubmit}
      onGoogleAuth={handleGoogleAuth}
      onGitHubAuth={handleGitHubAuth}
      isLoading={registerMutation.isPending}
      error={registerMutation.error?.message ?? null}
    />
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <Paragraph variant="muted">Loading...</Paragraph>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
