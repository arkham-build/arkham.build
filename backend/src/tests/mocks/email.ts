import type { Mailer } from "../../lib/email.ts";

export class MockMailer implements Mailer {
  public sentEmails: Array<{
    to: string;
    subject: string;
    body: string;
  }> = [];

  send(to: string, subject: string, body: string): Promise<void> {
    this.sentEmails.push({ to, subject, body });
    return Promise.resolve();
  }

  reset(): void {
    this.sentEmails.length = 0;
  }
}
