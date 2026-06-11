import type { Database } from "../../../db/db.ts";
import type {
  EnqueueOptions,
  JobDispatcher,
} from "../../../jobs/dispatcher.ts";
import type { Config } from "../../../lib/config.ts";
import { replaceVerificationToken } from "../queries/verification-tokens.ts";
import { generateRandomToken, hashToken } from "./crypto.ts";
import { verificationEmailTemplate } from "./email-templates.ts";

type SendVerificationEmailParams = {
  accountIdentityId: string;
  config: Config;
  dispatcher: JobDispatcher;
  email: string;
  options?: EnqueueOptions;
};

export async function sendVerificationEmail(
  db: Database,
  params: SendVerificationEmailParams,
) {
  const token = generateRandomToken();

  await replaceVerificationToken(db, {
    accountIdentityId: params.accountIdentityId,
    email: params.email,
    tokenHash: hashToken(token),
    tokenType: "email_verification",
    expiryHours: params.config.VERIFICATION_TOKEN_EXPIRY_HOURS,
  });

  const template = verificationEmailTemplate({
    token,
    verificationUrl: `${params.config.FRONTEND_URL}/auth/verify-email?token=${token}`,
  });

  await params.dispatcher.enqueueEmail(
    { subject: template.subject, text: template.text, to: params.email },
    params.options,
  );
}
