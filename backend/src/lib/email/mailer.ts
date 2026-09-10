import { createTransport, type Transporter } from "nodemailer";
import type { Config } from "../config.ts";

export interface Mailer {
  send(to: string, subject: string, body: string): Promise<void>;
}

export class SMTPMailer implements Mailer {
  private transporter: Transporter;
  private fromEmail: string;
  private fromName: string;

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
    this.fromName = config.FROM_NAME;
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    await this.transporter.sendMail({
      from: {
        address: this.fromEmail,
        name: this.fromName,
      },
      to,
      subject,
      text: body,
    });
  }
}
