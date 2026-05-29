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

export const CreateEmailIdentityRequestSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(8),
});

export type CreateEmailIdentityRequest = z.infer<
  typeof CreateEmailIdentityRequestSchema
>;

export const UpdateCredentialsRequestSchema = z
  .object({
    currentPassword: z.string().min(1),
    newEmail: z.email().max(255).nullish(),
    newPassword: z.string().min(8).nullish(),
  })
  .refine((value) => value.newEmail != null || value.newPassword != null, {
    message: "At least one credential change is required",
  });

export type UpdateCredentialsRequest = z.infer<
  typeof UpdateCredentialsRequestSchema
>;

export const ForgotPasswordRequestSchema = z.object({
  emailOrUsername: z.string().min(1).max(255),
});

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const EmailIdentitySchema = z.object({
  provider: z.literal("email"),
  email: z.email().max(255).nullable(),
  pendingEmail: z.email().max(255).nullable(),
  verified: z.boolean(),
});

export const ArkhamDBIdentitySchema = z.object({
  provider: z.literal("arkhamdb"),
  providerUserId: z.string(),
  details: z.object({
    status: z.enum(["healthy", "unhealthy"]),
    createdAt: z.string(),
    lastSyncedAt: z.string().nullish(),
    username: z.string().nullish(),
  }),
});

export const OAuthIdentitySchema = z.object({
  provider: z.string().refine((provider) => provider !== "email"),
  providerUserId: z.string(),
});

export const IdentitySchema = z.union([
  ArkhamDBIdentitySchema,
  EmailIdentitySchema,
  OAuthIdentitySchema,
]);

export type EmailIdentity = z.infer<typeof EmailIdentitySchema>;
export type OAuthIdentity = z.infer<typeof OAuthIdentitySchema>;
export type Identity = z.infer<typeof IdentitySchema>;
export type ArkhamDBIdentity = z.infer<typeof ArkhamDBIdentitySchema>;

export function isArkhamDBIdentity(
  identity: Identity | undefined,
): identity is ArkhamDBIdentity {
  return identity?.provider === "arkhamdb";
}

export const SessionResponseSchema = z.object({
  account: z.object({
    id: z.uuid(),
    name: z.string().max(64),
  }),
  identities: z.array(IdentitySchema),
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
