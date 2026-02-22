"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { Button, Paragraph } from "@/components/atoms";

type VerificationStatus = "loading" | "success" | "error" | "expired";

function EmailVerifiedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid verification link");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/verify-email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setTimeout(() => {
            router.push(redirectTo);
          }, 3000);
        } else if (response.status === 410) {
          setStatus("expired");
          setErrorMessage("This verification link has expired");
        } else {
          setStatus("error");
          setErrorMessage(data.error?.message || "Verification failed");
        }
      } catch {
        setStatus("error");
        setErrorMessage("Something went wrong. Please try again.");
      }
    };

    verifyEmail();
  }, [token, router, redirectTo]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Verifying your email...
              </h1>
              <p className="text-muted-foreground">
                Please wait while we verify your email address.
              </p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Email verified!
              </h1>
              <p className="text-muted-foreground">
                Your email has been verified successfully. Redirecting you to the
                dashboard...
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href={redirectTo}>Continue to Dashboard</Link>
            </Button>
          </>
        )}

        {(status === "error" || status === "expired") && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {status === "expired" ? "Link expired" : "Verification failed"}
              </h1>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>
            <div className="space-y-3">
              {status === "expired" && (
                <p className="text-sm text-muted-foreground">
                  Please request a new verification email from the login page.
                </p>
              )}
              <Button variant="outline" asChild className="w-full">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function EmailVerifiedPage() {
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
      <EmailVerifiedContent />
    </Suspense>
  );
}
