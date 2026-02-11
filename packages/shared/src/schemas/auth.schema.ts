import { z } from "zod";
import { emailSchema } from "./common.schema";

// =============================================================================
// OAUTH SCHEMAS
// =============================================================================

export const oauthProviderSchema = z.enum(["google", "apple"]);

export const oauthLoginSchema = z.object({
  provider: oauthProviderSchema,
  id_token: z.string().min(1),
  access_token: z.string().optional(),
  nonce: z.string().optional(), // Required for Apple Sign-In
});

export const oauthCallbackSchema = z.object({
  provider: oauthProviderSchema,
  code: z.string().min(1),
  state: z.string().optional(),
});

// =============================================================================
// EMAIL/PASSWORD AUTH SCHEMAS
// =============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number",
    ),
  first_name: z.string().min(1).max(100).trim(),
  last_name: z.string().min(1).max(100).trim(),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number",
    ),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number",
    ),
});

// Inferred types
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
export type OAuthLoginInput = z.infer<typeof oauthLoginSchema>;
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
