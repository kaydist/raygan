"use client";

import { useRouter } from "next/navigation";
import type { LoginRequest } from "@staq/shared";
import { SignInForm } from "@/components/organisms";
import { useLogin } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();

  const handleSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        router.push("/dashboard");
      },
    });
  };

  const handleGoogleAuth = () => {
    // TODO: Implement Google OAuth
  };

  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  return (
    <SignInForm
      onSubmit={handleSubmit}
      onGoogleAuth={handleGoogleAuth}
      onForgotPassword={handleForgotPassword}
      isLoading={loginMutation.isPending}
      error={loginMutation.error?.message ?? null}
    />
  );
}
