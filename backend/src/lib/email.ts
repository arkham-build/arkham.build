import { createTransport, type Transporter } from "nodemailer";
import type { Config } from "./config.ts";

export interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>;
}

export class SMTPMailer implements Mailer {
  private transporter: Transporter;
  private fromEmail: string;

  constructor(config: Config) {
    this.transporter = createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });
    this.fromEmail = config.FROM_EMAIL;
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromEmail,
      to,
      subject,
      text: body,
    });
  }
}

export class EmailService<M extends Mailer = Mailer> {
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
