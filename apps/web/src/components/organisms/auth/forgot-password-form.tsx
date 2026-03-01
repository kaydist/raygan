'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button, Heading, Paragraph, InlineBanner } from '@/components/atoms';
import { InputField } from '@/components/molecules';

interface ForgotPasswordFormProps {
  onSubmit?: (email: string) => void;
  isLoading?: boolean;
  isSuccess?: boolean;
  error?: string | null;
}

export function ForgotPasswordForm({
  onSubmit,
  isLoading,
  isSuccess,
  error,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(email);
  };

  if (isSuccess) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <Heading level={2} weight="semibold">
            Check your email
          </Heading>
          <Paragraph variant="muted">
            We&apos;ve sent a password reset link to{' '}
            <span className="font-medium text-foreground">{email}</span>
          </Paragraph>
        </div>

        <Paragraph size="sm" variant="muted" className="text-center">
          Didn&apos;t receive the email? Check your spam folder or{' '}
          <button
            type="button"
            onClick={() => onSubmit?.(email)}
            className="font-medium text-foreground underline hover:no-underline"
          >
            try again
          </button>
        </Paragraph>

        <Link href="/login" className="block">
          <Button variant="outline" className="h-12 w-full gap-2 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Heading level={2} weight="semibold">
          Reset password
        </Heading>
        <Paragraph variant="muted">
          Enter your email and we&apos;ll send you a reset link.
        </Paragraph>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <InlineBanner variant="error" message={error} />}

        <InputField
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />

        <Button
          type="submit"
          className="h-12 w-full gap-2 rounded-lg"
          loading={isLoading}
        >
          Send reset link
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <Paragraph size="sm" className="text-center">
        Remember your password?{' '}
        <Link href="/login" className="font-medium hover:underline">
          Sign in
        </Link>
      </Paragraph>
    </div>
  );
}
