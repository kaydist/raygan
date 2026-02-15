'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LoginRequest } from '@staq/shared';
import { SignInForm } from '@/components/organisms';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.auth.login(data);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    // TODO: Implement Google OAuth
    console.log('Google auth');
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <SignInForm
      onSubmit={handleSubmit}
      onGoogleAuth={handleGoogleAuth}
      onForgotPassword={handleForgotPassword}
      isLoading={isLoading}
      error={error}
    />
  );
}
