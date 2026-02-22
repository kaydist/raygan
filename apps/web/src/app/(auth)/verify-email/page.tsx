"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowLeft, RefreshCw, Loader2 } from "lucide-react";

import { Button, Paragraph } from "@/components/atoms";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/resend-verification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (response.ok) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch {
      // Silently fail
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Check your email
          </h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a verification link to
          </p>
          {email && (
            <p className="font-medium text-foreground">{email}</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>
            Click the link in the email to verify your account and get started.
            The link will expire in 24 hours.
          </p>
        </div>

        <div className="space-y-3">
          {resendSuccess ? (
            <p className="text-sm text-emerald-600">
              Verification email sent successfully!
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the email?{" "}
              <button
                onClick={handleResendEmail}
                disabled={isResending || !email}
                className="font-medium text-primary hover:underline disabled:opacity-50"
              >
                {isResending ? (
                  <span className="inline-flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Resend email"
                )}
              </button>
            </p>
          )}

          <Button variant="outline" asChild className="w-full">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Make sure to check your spam folder if you don&apos;t see the email in
          your inbox.
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
          <div className="w-full max-w-md space-y-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Loading...</h1>
              <Paragraph variant="muted">Please wait...</Paragraph>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
