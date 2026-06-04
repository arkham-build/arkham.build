import { z } from "zod";
import type { EmailTemplate } from "../../../lib/email/base-template.ts";

export const passwordResetEmailParamsSchema = z.object({
  resetUrl: z.url(),
});

export type PasswordResetEmailParams = z.infer<
  typeof passwordResetEmailParamsSchema
>;

export function passwordResetEmailTemplate(
  params: PasswordResetEmailParams,
): EmailTemplate {
  const validated = passwordResetEmailParamsSchema.parse(params);

  return {
    subject: "Reset your password",
    text: `Password Reset Request

You requested to reset your password. Click the link below to continue:
${validated.resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.`,
  };
}

export const verificationEmailParamsSchema = z.object({
  token: z.string().min(1),
  verificationUrl: z.url(),
});

export type VerificationEmailParams = z.infer<
  typeof verificationEmailParamsSchema
>;

export function verificationEmailTemplate(
  params: VerificationEmailParams,
): EmailTemplate {
  const validated = verificationEmailParamsSchema.parse(params);

  return {
    subject: "Verify your email address",
    text: `Welcome to arkham.build!

Please verify your email address by clicking the link below:
${validated.verificationUrl}

Or copy and paste this verification token:
${validated.token}

This link and token will expire in 24 hours.`,
  };
}
