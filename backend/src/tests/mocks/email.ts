import type { Mailer } from "../../lib/email/mailer.ts";

export class MockMailer implements Mailer {
  public sentEmails: Array<{
    to: string;
    subject: string;
    body: string;
  }> = [];
  private nextError: Error | null = null;

  failOnce(error = new Error("Failed to send email")): void {
    this.nextError = error;
  }

  send(to: string, subject: string, body: string): Promise<void> {
    if (this.nextError) {
      const error = this.nextError;
      this.nextError = null;
      throw error;
    }

    this.sentEmails.push({ to, subject, body });
    return Promise.resolve();
  }

  reset(): void {
    this.sentEmails.length = 0;
    this.nextError = null;
  }
}
