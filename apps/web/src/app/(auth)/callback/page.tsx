"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Heading, Paragraph } from "@/components/atoms";
import { setAuthToken, setRefreshToken } from "@/lib/utils";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const expiresIn = searchParams.get("expires_in");
    const errorParam = searchParams.get("error");
    const redirectTo = searchParams.get("redirect") || "/dashboard";

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    if (accessToken && refreshToken) {
      const expiresInSeconds = expiresIn ? parseInt(expiresIn, 10) : 3600;
      setAuthToken(accessToken, expiresInSeconds);
      setRefreshToken(refreshToken);
      router.replace(redirectTo);
    } else {
      setError("Authentication failed. Missing tokens.");
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="space-y-8 text-center">
        <div className="space-y-2">
          <Heading level={2} weight="semibold">
            Authentication failed
          </Heading>
          <Paragraph variant="muted">{error}</Paragraph>
        </div>
        <Paragraph size="sm">
          <a href="/login" className="font-medium hover:underline">
            Return to sign in
          </a>
        </Paragraph>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <Paragraph variant="muted">Completing sign in...</Paragraph>
    </div>
  );
}
