import assert from "node:assert";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { Config } from "./config.ts";
import { log } from "./logger.ts";

export interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>;
}

export class SESMailer implements Mailer {
  private client: SESClient;
  private fromEmail: string;

  constructor(config: Config) {
    assert(
      config.AWS_REGION &&
        config.AWS_ACCESS_KEY_ID &&
        config.AWS_SECRET_ACCESS_KEY,
      "AWS credentials are required for SESMailer",
    );

    this.client = new SESClient({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    });
    this.fromEmail = config.FROM_EMAIL;
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    const command = new SendEmailCommand({
      Source: this.fromEmail,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: body,
            Charset: "UTF-8",
          },
        },
      },
    });

    await this.client.send(command);
  }
}

export class DebugMailer implements Mailer {
  send(to: string, subject: string, body: string): Promise<void> {
    log("info", "Email sent", { to, subject, body });
    return Promise.resolve();
  }
}

export class EmailService<M extends Mailer> {
  mailer: M;
  private frontendUrl: string;

  constructor(mailer: M, frontendUrl: string) {
    this.mailer = mailer;
    this.frontendUrl = frontendUrl;
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    const body = `Welcome to Arkham Build!

Please verify your email address by clicking the link below:
${verificationUrl}

This link will expire in 24 hours.`;

    await this.mailer.send(email, "Verify your email address", body);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    const body = `Password Reset Request

You requested to reset your password. Click the link below to continue:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.`;

    await this.mailer.send(email, "Reset your password", body);
  }
}

export function createEmailService(config: Config, mailer: Mailer) {
  return new EmailService(mailer, config.FRONTEND_URL);
}
