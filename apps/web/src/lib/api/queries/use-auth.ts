import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  GoogleOAuthRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "@raygan/shared";

import { authApi } from "../routes/auth";
import { queryKeys } from "./query-keys";

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, LoginRequest>({
    mutationFn: (data) => authApi.login(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, RegisterRequest>({
    mutationFn: (data) => authApi.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
}

export function useGoogleOAuth() {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, GoogleOAuthRequest>({
    mutationFn: (data) => authApi.googleOAuth(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation<{ message: string }, Error, ForgotPasswordRequest>({
    mutationFn: (data) => authApi.forgotPassword(data),
  });
}

export function useResetPassword() {
  return useMutation<{ message: string }, Error, ResetPasswordRequest>({
    mutationFn: (data) => authApi.resetPassword(data),
  });
}

export function useResendVerification() {
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (email) => authApi.resendVerification(email),
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (token) => authApi.verifyEmail(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
}
