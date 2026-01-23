import { z } from "zod";

export const SignupRequestSchema = z.object({
  name: z.string().min(1).max(64),
  email: z.email().max(255),
  password: z.string().min(8),
});

// at least 8 characters
export const PATTERN_VALID_PASSWORD = ".{8,}";

export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.email().max(255),
  password: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  emailOrUsername: z.string().min(1).max(255),
});

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const MeResponseSchema = z.object({
  account: z.object({
    id: z.uuid(),
    name: z.string().max(64),
    email: z.email().nullable(),
  }),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;

export const ResetPasswordRequestSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const VerifyEmailRequestSchema = z.object({
  token: z.string(),
});

export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

export const ResendVerificationRequestSchema = z.object({
  email: z.email(),
});

export type ResendVerificationRequest = z.infer<
  typeof ResendVerificationRequestSchema
>;
