"use client";

import { ForgotPasswordForm } from "@/components/organisms";
import { useForgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const forgotPasswordMutation = useForgotPassword();

  const handleSubmit = (email: string) => {
    forgotPasswordMutation.mutate({ email });
  };

  return (
    <ForgotPasswordForm
      onSubmit={handleSubmit}
      isLoading={forgotPasswordMutation.isPending}
      isSuccess={forgotPasswordMutation.isSuccess}
      error={forgotPasswordMutation.error?.message ?? null}
    />
  );
}
