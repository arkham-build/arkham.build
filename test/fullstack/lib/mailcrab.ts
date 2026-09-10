import { setTimeout as delay } from "node:timers/promises";
import { mailcrabUrl } from "./env.ts";
import { fetchJson } from "./wait.ts";

type MailCrabMessage = {
  id: string;
  subject: string;
  to: Array<{
    email: string;
  }>;
};

export async function waitForPasswordResetUrl(email: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 60000) {
    const resetUrl = await findPasswordResetUrl(email);

    if (resetUrl) {
      return resetUrl;
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for password reset email for ${email}`);
}

export async function waitForEmailVerificationUrl(email: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 60000) {
    const verificationUrl = await findEmailVerificationUrl(email);

    if (verificationUrl) {
      return verificationUrl;
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for verification email for ${email}`);
}

export async function assertNoPasswordResetEmail(email: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 5000) {
    const resetUrl = await findPasswordResetUrl(email);

    if (resetUrl) {
      throw new Error(`Unexpected password reset email for ${email}`);
    }

    await delay(500);
  }
}

function findPasswordResetUrl(email: string) {
  return findUrlInEmail(email, "Reset your password", extractPasswordResetUrl);
}

function findEmailVerificationUrl(email: string) {
  return findUrlInEmail(
    email,
    "Verify your email address",
    extractEmailVerificationUrl,
  );
}

async function findUrlInEmail(
  email: string,
  subject: string,
  extractUrl: (text: string) => string | null,
) {
  const messages = await fetchJson<Array<MailCrabMessage>>(
    `${mailcrabUrl}/api/messages`,
  );
  const message = messages.find(
    (item) =>
      item.subject === subject &&
      item.to.some((recipient) => recipient.email === email),
  );

  if (!message) {
    return null;
  }

  const detail = await fetchJson<{ text: string }>(
    `${mailcrabUrl}/api/message/${message.id}`,
  );
  return extractUrl(detail.text);
}

function extractPasswordResetUrl(text: string) {
  return (
    text.match(/https?:\/\/\S+\/auth\/reset-password#token=\S+/)?.[0] ?? null
  );
}

function extractEmailVerificationUrl(text: string) {
  return (
    text.match(/https?:\/\/\S+\/auth\/verify-email\?token=\S+/)?.[0] ?? null
  );
}
