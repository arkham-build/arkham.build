import { z } from "zod";
import type { EmailTemplate } from "./base.ts";

export const verificationEmailParamsSchema = z.object({
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

This link will expire in 24 hours.`,
  };
}
