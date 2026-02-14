'use client';

import { useRouter } from 'next/navigation';
import { SignInForm } from '@/components/organisms';

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = async (data: { email: string; password: string }) => {
    // TODO: Implement sign in logic
    console.log('Sign in:', data);
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
    />
  );
}
