import {
  type CompleteProfileRequest,
  CompleteProfileRequestSchema,
  type CompleteProfileResponse,
  CompleteProfileResponseSchema,
  type CreateEmailIdentityRequest,
  CreateEmailIdentityRequestSchema,
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
  type UpdateCredentialsRequest,
  UpdateCredentialsRequestSchema,
  type VerifyEmailRequest,
  VerifyEmailRequestSchema,
} from "@arkham-build/shared";
import type { HttpClient } from "../http-client";

export async function postLogin(
  client: HttpClient,
  payload: LoginRequest,
): Promise<void> {
  await client.request("/v2/account/auth/login", {
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
  await client.request("/v2/account/auth/signup", {
    unauthorizedBehavior: "ignore",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(SignupRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function postLogout(client: HttpClient): Promise<void> {
  await client.request("/v2/account/auth/logout", {
    unauthorizedBehavior: "ignore",
    method: "POST",
    credentials: "include",
  });
}

export async function deleteAccount(client: HttpClient): Promise<void> {
  await client.request("/v2/account/auth/account", {
    method: "DELETE",
    credentials: "include",
  });
}

export async function postCreateEmailIdentity(
  client: HttpClient,
  payload: CreateEmailIdentityRequest,
): Promise<void> {
  await client.request("/v2/account/auth/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CreateEmailIdentityRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function patchUpdateCredentials(
  client: HttpClient,
  payload: UpdateCredentialsRequest,
): Promise<void> {
  await client.request("/v2/account/auth/credentials", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(UpdateCredentialsRequestSchema.parse(payload)),
    credentials: "include",
  });
}

export async function deletePendingEmailChange(
  client: HttpClient,
): Promise<void> {
  await client.request("/v2/account/auth/credentials/pending-email", {
    method: "DELETE",
    credentials: "include",
  });
}

export async function disconnectOAuthIdentity(
  client: HttpClient,
  provider: string,
): Promise<void> {
  await client.request(`/v2/account/auth/oauth/${provider}`, {
    method: "DELETE",
    credentials: "include",
  });
}

export async function fetchSession(
  client: HttpClient,
): Promise<SessionResponse> {
  const res = await client.request("/v2/account/auth/me", {
    credentials: "include",
  });

  return SessionResponseSchema.parse(await res.json());
}

export async function postVerifyEmail(
  client: HttpClient,
  payload: VerifyEmailRequest,
): Promise<void> {
  await client.request("/v2/account/auth/verify-email", {
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
  await client.request("/v2/account/auth/resend-verification", {
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
  await client.request("/v2/account/auth/forgot-password", {
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
  await client.request("/v2/account/auth/reset-password", {
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
): Promise<CompleteProfileResponse> {
  const res = await client.request("/v2/account/auth/complete-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CompleteProfileRequestSchema.parse(payload)),
    credentials: "include",
  });

  return CompleteProfileResponseSchema.parse(await res.json());
}
