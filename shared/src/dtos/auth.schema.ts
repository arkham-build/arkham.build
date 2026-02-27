import { z } from "zod";

// alphanumeric characters, underscore, and hyphen only
export const PATTERN_VALID_USERNAME = "^[a-zA-Z0-9_-]+$";

export const SignupRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(
      new RegExp(PATTERN_VALID_USERNAME),
      "Username can only contain letters, numbers, underscores, and hyphens",
    ),
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

export const SessionResponseSchema = z.object({
  account: z.object({
    id: z.uuid(),
    name: z.string().max(64),
    email: z.email().nullable(),
  }),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

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

export const CompleteProfileRequestSchema = z.object({
  username: z.string().min(3).max(64).regex(new RegExp(PATTERN_VALID_USERNAME)),
});

export type CompleteProfileRequest = z.infer<
  typeof CompleteProfileRequestSchema
>;
