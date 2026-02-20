'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { LoginRequest } from '@staq/shared';
import { Button, Heading, Paragraph } from '@/components/atoms';
import { GoogleOAuthButton, GitHubOAuthButton, FormField, OrDivider } from '@/components/molecules';

interface SignInFormProps {
  onSubmit?: (data: LoginRequest) => void;
  onGoogleAuth?: () => void;
  onGitHubAuth?: () => void;
  onForgotPassword?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function SignInForm({
  onSubmit,
  onGoogleAuth,
  onGitHubAuth,
  onForgotPassword,
  isLoading,
  error,
}: SignInFormProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ email, password });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Heading level={2} weight="semibold">
          Sign in
        </Heading>
        <Paragraph variant="muted">
          Welcome back. Pick up where you left off.
        </Paragraph>
      </div>

      <div className="flex gap-3">
        <GoogleOAuthButton onClick={onGoogleAuth} disabled={isLoading} />
        <GitHubOAuthButton onClick={onGitHubAuth} disabled={isLoading} />
      </div>

      <OrDivider />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <FormField
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />

        <FormField
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          action={{
            label: 'Forgot?',
            onClick: () => onForgotPassword?.(),
          }}
          required
          disabled={isLoading}
        />

        <Button
          type="submit"
          className="h-12 w-full gap-2 rounded-lg"
          loading={isLoading}
        >
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <Paragraph size="sm" className="text-center">
        No account?{' '}
        <Link href="/register" className="font-medium hover:underline">
          Create one
        </Link>
      </Paragraph>
    </div>
  );
}
