'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button, Heading, Paragraph } from '@/components/atoms';
import { GoogleOAuthButton, FormField, OrDivider } from '@/components/molecules';

interface SignInFormProps {
  onSubmit?: (data: { email: string; password: string }) => void;
  onGoogleAuth?: () => void;
  onForgotPassword?: () => void;
  isLoading?: boolean;
}

export function SignInForm({
  onSubmit,
  onGoogleAuth,
  onForgotPassword,
  isLoading,
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

      <GoogleOAuthButton onClick={onGoogleAuth} disabled={isLoading} />

      <OrDivider />

      <form onSubmit={handleSubmit} className="space-y-6">
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
          disabled={isLoading}
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
