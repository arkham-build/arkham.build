import { ServerClient } from "postmark";
import type { Config } from "./config.ts";

export interface EmailService {
  sendVerificationEmail(email: string, token: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}

export function createEmailService(config: Config): EmailService {
  const client = new ServerClient(config.POSTMARK_API_TOKEN);

  return {
    async sendVerificationEmail(email: string, token: string) {
      const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;

      await client.sendEmail({
        From: config.POSTMARK_FROM_EMAIL,
        To: email,
        Subject: "Verify your email address",
        TextBody: `
Welcome to Arkham Build!

Please verify your email address by clicking the link below:
${verificationUrl}

This link will expire in 24 hours.
`,
      });
    },

    async sendPasswordResetEmail(email: string, token: string) {
      const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;

      await client.sendEmail({
        From: config.POSTMARK_FROM_EMAIL,
        To: email,
        Subject: "Reset your password",
        TextBody: `
Password Reset Request

You requested to reset your password. Click the link below to continue:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.
        `,
      });
    },
  };
}
