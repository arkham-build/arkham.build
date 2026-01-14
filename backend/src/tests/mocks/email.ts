import type { EmailService } from "../../lib/email.ts";

export interface MockEmailService extends EmailService {
  sentEmails: Array<{
    type: "verification" | "password_reset";
    email: string;
    token: string;
  }>;
  reset(): void;
}

export function createMockEmailService(): MockEmailService {
  const sentEmails: MockEmailService["sentEmails"] = [];

  return {
    sentEmails,

    sendVerificationEmail(email: string, token: string) {
      sentEmails.push({ type: "verification", email, token });
      return Promise.resolve();
    },

    sendPasswordResetEmail(email: string, token: string) {
      sentEmails.push({ type: "password_reset", email, token });
      return Promise.resolve();
    },

    reset() {
      sentEmails.length = 0;
    },
  };
}
