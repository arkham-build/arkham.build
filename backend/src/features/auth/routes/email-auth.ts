import assert from "node:assert";
import {
  LoginRequestSchema,
  ResendVerificationRequestSchema,
  SignupRequestSchema,
  VerifyEmailRequestSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { HonoEnv } from "../../../lib/hono-env.ts";
import { zodValidator } from "../../../lib/validation.ts";
import {
  assertEmailAvailable,
  assertVerificationTokenCooldown,
  isUniqueViolation,
} from "../assertions.ts";
import {
  generateRandomToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../crypto.ts";
import { verificationEmailTemplate } from "../email-templates.ts";
import { setSessionCookie } from "../oauth/session-cookie.ts";
import {
  accountNameExists,
  createAccount,
  getAccount,
} from "../queries/accounts.ts";
import {
  activatePendingAccountIdentityEmail,
  getAccountIdentity,
  getAccountIdentityByEmail,
  updateAccountIdentityVerified,
} from "../queries/identities.ts";
import { createSession, deleteSession } from "../queries/sessions.ts";
import {
  consumeVerificationToken,
  replaceVerificationToken,
} from "../queries/verification-tokens.ts";
import { sessionAuth } from "../session-auth-middleware.ts";
import { assertTurnstileToken } from "../turnstile.ts";

const routes = new Hono<HonoEnv>();

routes.post("/signup", zodValidator("json", SignupRequestSchema), async (c) => {
  const db = c.get("db");
  const config = c.get("config");
  const dispatcher = c.get("dispatcher");
  const { name, email, password, captchaToken } = c.req.valid("json");

  await assertTurnstileToken(c, captchaToken);

  if (await accountNameExists(db, name)) {
    throw new HTTPException(400, {
      message: "Username is already taken",
    });
  }

  await assertEmailAvailable(db, email);

  const passwordHash = await hashPassword(password);

  await db.transaction().execute(async (tx) => {
    const { accountIdentity } = await createAccount(tx, {
      name,
      email,
      passwordHash,
    });

    const token = generateRandomToken();

    await replaceVerificationToken(tx, {
      accountIdentityId: accountIdentity.id,
      email,
      tokenHash: hashToken(token),
      tokenType: "email_verification",
      expiryHours: config.VERIFICATION_TOKEN_EXPIRY_HOURS,
    });

    const template = verificationEmailTemplate({
      token,
      verificationUrl: `${config.FRONTEND_URL}/auth/verify-email?token=${token}`,
    });

    await dispatcher.enqueueEmail(
      { subject: template.subject, text: template.text, to: email },
      { tx },
    );
  });

  return new Response(null, { status: 201 });
});

routes.post("/login", zodValidator("json", LoginRequestSchema), async (c) => {
  const db = c.get("db");
  const config = c.get("config");
  const { email, password } = c.req.valid("json");

  const accountIdentity = await getAccountIdentityByEmail(db, email);

  if (!accountIdentity?.password_hash || !accountIdentity?.email) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  const isPasswordValid = await verifyPassword(
    password,
    accountIdentity.password_hash,
  );

  if (!isPasswordValid) {
    throw new HTTPException(401, { message: "Invalid email or password" });
  }

  if (!accountIdentity.verified_at) {
    throw new HTTPException(403, {
      message: "Account is not verified",
    });
  }

  const account = await getAccount(db, accountIdentity.account_id);
  assert(account, "Account should exist for valid account identity");

  const session = await createSession(
    db,
    account.id,
    config.SESSION_EXPIRY_HOURS,
  );

  setSessionCookie(c, session.id);
  return new Response(null, { status: 200 });
});

routes.post("/logout", sessionAuth(), async (c) => {
  const db = c.get("db");
  const config = c.get("config");

  c.set("skipSessionCookieRefresh", true);

  const sessionId = getCookie(c, config.SESSION_COOKIE_NAME);
  if (sessionId) {
    await deleteSession(db, sessionId);
  }

  deleteCookie(c, config.SESSION_COOKIE_NAME);
  return new Response(null, { status: 200 });
});

routes.post(
  "/verify-email",
  zodValidator("json", VerifyEmailRequestSchema),
  async (c) => {
    const db = c.get("db");
    const { token } = c.req.valid("json");

    await db.transaction().execute(async (tx) => {
      const verificationToken = await consumeVerificationToken(
        tx,
        hashToken(token),
        "email_verification",
      );

      if (!verificationToken?.account_identity_id) {
        throw new HTTPException(400, {
          message: "Invalid or expired verification token",
        });
      }

      const accountIdentity = await getAccountIdentity(
        tx,
        verificationToken.account_identity_id,
      );

      if (!accountIdentity) {
        throw new HTTPException(400, {
          message: "Invalid or expired verification token",
        });
      }

      if (accountIdentity.pending_email === verificationToken.email) {
        await assertEmailAvailable(
          tx,
          verificationToken.email,
          accountIdentity.id,
        );

        try {
          await activatePendingAccountIdentityEmail(
            tx,
            accountIdentity.id,
            verificationToken.email,
          );
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new HTTPException(400, {
              message: "An account is already registered for this email",
            });
          }

          throw error;
        }

        return;
      }

      if (accountIdentity.email !== verificationToken.email) {
        throw new HTTPException(400, {
          message: "Invalid or expired verification token",
        });
      }

      await updateAccountIdentityVerified(
        tx,
        verificationToken.account_identity_id,
      );
    });

    return new Response(null, { status: 200 });
  },
);

routes.post(
  "/resend-verification",
  zodValidator("json", ResendVerificationRequestSchema),
  async (c) => {
    const { email } = c.req.valid("json");
    const db = c.get("db");
    const config = c.get("config");
    const dispatcher = c.get("dispatcher");

    const accountIdentity = await getAccountIdentityByEmail(db, email);

    if (accountIdentity && !accountIdentity.verified_at) {
      await assertVerificationTokenCooldown(db, email, "email_verification");

      const token = generateRandomToken();
      const tokenHash = hashToken(token);

      await db.transaction().execute(async (tx) => {
        await replaceVerificationToken(tx, {
          accountIdentityId: accountIdentity.id,
          email,
          tokenHash,
          tokenType: "email_verification",
          expiryHours: config.VERIFICATION_TOKEN_EXPIRY_HOURS,
        });
        const template = verificationEmailTemplate({
          token,
          verificationUrl: `${config.FRONTEND_URL}/auth/verify-email?token=${token}`,
        });

        await dispatcher.enqueueEmail(
          { subject: template.subject, text: template.text, to: email },
          { tx },
        );
      });
    }

    return new Response(null, { status: 200 });
  },
);

export default routes;
