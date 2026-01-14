import { z } from "zod";

export const SignupRequestSchema = z.object({
  name: z.string().min(1).max(64),
  email: z.email().max(255),
  password: z.string().min(8),
});

export const LoginRequestSchema = z.object({
  email: z.email().max(255),
  password: z.string(),
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.email(),
});

export const MeResponse = z.object({
  account: z.object({
    id: z.uuid(),
    name: z.string().max(64),
    email: z.email().nullable(),
  }),
});

export const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export const VerifyEmailRequestSchema = z.object({
  token: z.string(),
});
