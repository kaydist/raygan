"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Heading, Paragraph } from "@/components/atoms";
import { setAuthToken, setRefreshToken } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function parseHashParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.substring(1);
  if (!hash) return {};
  const params: Record<string, string> = {};
  for (const pair of hash.split("&")) {
    const [key, value] = pair.split("=");
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return params;
}

async function registerOAuthSession(accessToken: string, refreshToken: string | null): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/auth/oauth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || "Failed to complete authentication");
  }
}

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const errorParam = searchParams.get("error");
    const redirectTo = searchParams.get("redirect") || "/dashboard";

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    let accessToken = searchParams.get("access_token");
    let refreshToken = searchParams.get("refresh_token");
    let expiresIn = searchParams.get("expires_in");

    if (!accessToken) {
      const hashParams = parseHashParams();
      accessToken = hashParams.access_token || null;
      refreshToken = hashParams.refresh_token || null;
      expiresIn = hashParams.expires_in || null;
    }

    if (accessToken) {
      const expiresInSeconds = expiresIn ? parseInt(expiresIn, 10) : 3600;
      setAuthToken(accessToken, expiresInSeconds);
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }

      registerOAuthSession(accessToken, refreshToken)
        .then(() => {
          if (typeof window !== "undefined") {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          }
          router.replace(redirectTo);
        })
        .catch((err) => {
          setError(err.message || "Failed to complete authentication");
        });
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

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <Paragraph variant="muted">Loading...</Paragraph>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
