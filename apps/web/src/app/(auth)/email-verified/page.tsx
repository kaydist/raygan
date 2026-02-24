"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useVerifyEmail } from "@/lib/api";
import { Button, Heading, Paragraph } from "@/components/atoms";

type VerificationState = "loading" | "success" | "error";

function EmailVerifiedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const verifyMutation = useVerifyEmail();
  const [state, setState] = useState<VerificationState>("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }

    verifyMutation.mutate(token, {
      onSuccess: () => setState("success"),
      onError: () => setState("error"),
    });
  }, [token]);

  if (state === "loading") {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div className="space-y-2">
          <Heading level={2} weight="semibold">
            Verifying your email
          </Heading>
          <Paragraph variant="muted">Please wait while we verify your email address...</Paragraph>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <div className="space-y-2">
          <Heading level={2} weight="semibold">
            Email verified!
          </Heading>
          <Paragraph variant="muted">
            Your email has been successfully verified. You can now sign in to your account.
          </Paragraph>
        </div>
        <Button onClick={() => router.push("/login")} className="w-full">
          Continue to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <XCircle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <Heading level={2} weight="semibold">
          Verification failed
        </Heading>
        <Paragraph variant="muted">
          {verifyMutation.error?.message || "The verification link is invalid or has expired."}
        </Paragraph>
      </div>
      <div className="space-y-3">
        <Button onClick={() => router.push("/login")} className="w-full">
          Go to sign in
        </Button>
        <Paragraph size="sm" variant="muted">
          Need a new verification link? Sign in and we&apos;ll send you one.
        </Paragraph>
      </div>
    </div>
  );
}

export default function EmailVerifiedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <Paragraph variant="muted">Loading...</Paragraph>
        </div>
      }
    >
      <EmailVerifiedContent />
    </Suspense>
  );
}
