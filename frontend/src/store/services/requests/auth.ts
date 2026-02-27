import {
  type CompleteProfileRequest,
  CompleteProfileRequestSchema,
  type ForgotPasswordRequest,
  ForgotPasswordRequestSchema,
  type LoginRequest,
  LoginRequestSchema,
  type ResendVerificationRequest,
  ResendVerificationRequestSchema,
  type ResetPasswordRequest,
  ResetPasswordRequestSchema,
  type SessionResponse,
  SessionResponseSchema,
  type SignupRequest,
  SignupRequestSchema,
  type VerifyEmailRequest,
  VerifyEmailRequestSchema,
} from "@arkham-build/shared";
import { apiV2Request } from "./shared.ts";

export async function postLogin(payload: LoginRequest): Promise<void> {
  await apiV2Request("/v2/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(LoginRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postSignup(payload: SignupRequest): Promise<void> {
  await apiV2Request("/v2/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(SignupRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postLogout(): Promise<void> {
  await apiV2Request("/v2/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function fetchSession(): Promise<SessionResponse> {
  const res = await apiV2Request("/v2/auth/me", {
    credentials: "include",
  });

  return SessionResponseSchema.parse(await res.json());
}

export async function postVerifyEmail(
  payload: VerifyEmailRequest,
): Promise<void> {
  await apiV2Request("/v2/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(VerifyEmailRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postResendVerification(
  payload: ResendVerificationRequest,
): Promise<void> {
  await apiV2Request("/v2/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ResendVerificationRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postForgotPassword(
  payload: ForgotPasswordRequest,
): Promise<void> {
  await apiV2Request("/v2/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ForgotPasswordRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postResetPassword(
  payload: ResetPasswordRequest,
): Promise<void> {
  await apiV2Request("/v2/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ResetPasswordRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postCompleteProfile(
  payload: CompleteProfileRequest,
): Promise<void> {
  await apiV2Request("/v2/auth/complete-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CompleteProfileRequestSchema.parse(payload)),
    credentials: "include",
  });
}
