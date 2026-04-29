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
import type { HttpClient } from "../http-client";

export async function postLogin(
  client: HttpClient,
  payload: LoginRequest,
): Promise<void> {
  await client.request("/v2/auth/login", {
    unauthorizedBehavior: "ignore",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(LoginRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postSignup(
  client: HttpClient,
  payload: SignupRequest,
): Promise<void> {
  await client.request("/v2/auth/signup", {
    unauthorizedBehavior: "ignore",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(SignupRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postLogout(client: HttpClient): Promise<void> {
  await client.request("/v2/auth/logout", {
    unauthorizedBehavior: "ignore",
    method: "POST",
    credentials: "include",
  });
}

export async function fetchSession(
  client: HttpClient,
): Promise<SessionResponse> {
  const res = await client.request("/v2/auth/me", {
    credentials: "include",
  });

  return SessionResponseSchema.parse(await res.json());
}

export async function postVerifyEmail(
  client: HttpClient,
  payload: VerifyEmailRequest,
): Promise<void> {
  await client.request("/v2/auth/verify-email", {
    unauthorizedBehavior: "ignore",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(VerifyEmailRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postResendVerification(
  client: HttpClient,
  payload: ResendVerificationRequest,
): Promise<void> {
  await client.request("/v2/auth/resend-verification", {
    unauthorizedBehavior: "ignore",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ResendVerificationRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postForgotPassword(
  client: HttpClient,
  payload: ForgotPasswordRequest,
): Promise<void> {
  await client.request("/v2/auth/forgot-password", {
    unauthorizedBehavior: "ignore",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ForgotPasswordRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postResetPassword(
  client: HttpClient,
  payload: ResetPasswordRequest,
): Promise<void> {
  await client.request("/v2/auth/reset-password", {
    unauthorizedBehavior: "ignore",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ResetPasswordRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postCompleteProfile(
  client: HttpClient,
  payload: CompleteProfileRequest,
): Promise<void> {
  await client.request("/v2/auth/complete-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CompleteProfileRequestSchema.parse(payload)),
    credentials: "include",
  });
}
