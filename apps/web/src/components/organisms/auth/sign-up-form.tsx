'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { RegisterRequest } from '@staq/shared';
import { Button, Heading, Paragraph } from '@/components/atoms';
import { GoogleOAuthButton, GitHubOAuthButton, InputField, OrDivider } from '@/components/molecules';

interface SignUpFormProps {
  onSubmit?: (data: RegisterRequest) => void;
  onGoogleAuth?: () => void;
  onGitHubAuth?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function SignUpForm({
  onSubmit,
  onGoogleAuth,
  onGitHubAuth,
  isLoading,
  error,
}: SignUpFormProps) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const validatePassword = (value: string): string | null => {
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/(?=.*[a-z])/.test(value)) {
      return 'Password must contain a lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(value)) {
      return 'Password must contain an uppercase letter';
    }
    if (!/(?=.*\d)/.test(value)) {
      return 'Password must contain a number';
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      errors.password = passwordError;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    onSubmit?.({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email,
      password,
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Heading level={2} weight="semibold">
          Create account
        </Heading>
        <Paragraph variant="muted">
          Start building your next app in minutes.
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

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="First name"
            type="text"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={fieldErrors.firstName}
            required
            disabled={isLoading}
          />

          <InputField
            label="Last name"
            type="text"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={fieldErrors.lastName}
            required
            disabled={isLoading}
          />
        </div>

        <InputField
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />

        <InputField
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          required
          disabled={isLoading}
        />

        <Paragraph size="xs" variant="muted">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </Paragraph>

        <Button
          type="submit"
          className="h-12 w-full gap-2 rounded-lg"
          loading={isLoading}
        >
          Create account
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <Paragraph size="sm" className="text-center">
        Already have an account?{' '}
        <Link href="/login" className="font-medium hover:underline">
          Sign in
        </Link>
      </Paragraph>
    </div>
  );
}
