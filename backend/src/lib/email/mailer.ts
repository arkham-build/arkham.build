import { createTransport, type Transporter } from "nodemailer";
import type { Config } from "../config.ts";

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
