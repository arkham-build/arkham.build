import { z } from "zod";
import type { EmailTemplate } from "./base.ts";

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
