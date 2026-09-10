import assert from "node:assert";
import { randomUUID } from "node:crypto";
import {
  LoginRequestSchema,
  ResendVerificationRequestSchema,
  SignupRequestSchema,
  VerifyEmailRequestSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import {
  getAccountIdentity,
  getAccountIdentityByEmail,
  getAccountIdentityByEmailOrPendingEmail,
} from "../../../lib/auth/account-identities.ts";
import { assertAccountNotBanned } from "../../../lib/auth/account-moderation-actions.ts";
import { findAccountForAuth } from "../../../lib/auth/accounts.ts";
import { sessionAuth } from "../../../lib/auth/session-auth-middleware.ts";
import { setSessionCookie } from "../../../lib/auth/session-cookie.ts";
import { createSession, deleteSession } from "../../../lib/auth/sessions.ts";
import { isUniqueViolation } from "../../../lib/db-errors.ts";
import type { HonoEnv } from "../../../lib/hono-env.ts";
import { zodValidator } from "../../../lib/validation.ts";
import {
  assertEmailAvailable,
  assertVerificationTokenCooldown,
} from "../lib/assertions.ts";
import { hashPassword, hashToken, verifyPassword } from "../lib/crypto.ts";
import { assertTurnstileToken } from "../lib/turnstile.ts";
import { sendVerificationEmail } from "../lib/verification-email.ts";
import { createAccount } from "../queries/accounts.ts";
import {
  activatePendingAccountIdentityEmail,
  updateAccountIdentityVerified,
} from "../queries/identities.ts";
import { consumeVerificationToken } from "../queries/verification-tokens.ts";

const routes = new Hono<HonoEnv>();

routes.post("/signup", zodValidator("json", SignupRequestSchema), async (c) => {
  const db = c.get("db");
  const config = c.get("config");
  const dispatcher = c.get("dispatcher");
  const { email, password, captchaToken } = c.req.valid("json");

  await assertTurnstileToken(c, captchaToken);
  await assertEmailAvailable(db, email);

  const passwordHash = await hashPassword(password);

  await db.transaction().execute(async (tx) => {
    const { accountIdentity } = await createAccount(tx, {
      name: `email_${randomUUID()}`,
      email,
      passwordHash,
      profileCompletedAt: null,
    });

    await sendVerificationEmail(tx, {
      accountIdentityId: accountIdentity.id,
      config,
      dispatcher,
      email,
      options: { tx },
    });
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

  const account = await findAccountForAuth(db, accountIdentity.account_id);
  assert(account, "Account should exist for valid account identity");

  assertAccountNotBanned(account);

  const session = await createSession(
    db,
    account.id,
    config.SESSION_EXPIRY_HOURS,
  );

  setSessionCookie(c, session.token);
  return new Response(null, { status: 200 });
});

routes.post(
  "/logout",
  sessionAuth({ requireCompleteProfile: false }),
  async (c) => {
    const db = c.get("db");
    const config = c.get("config");

    c.set("skipSessionCookieRefresh", true);

    const sessionToken = getCookie(c, config.SESSION_COOKIE_NAME);
    if (sessionToken) {
      await deleteSession(db, sessionToken);
    }

    deleteCookie(c, config.SESSION_COOKIE_NAME, { path: "/" });
    return new Response(null, { status: 200 });
  },
);

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

    const accountIdentity = await getAccountIdentityByEmailOrPendingEmail(
      db,
      email,
    );

    const shouldResend =
      !!accountIdentity &&
      ((accountIdentity.email === email && !accountIdentity.verified_at) ||
        accountIdentity.pending_email === email);

    if (shouldResend) {
      await assertVerificationTokenCooldown(db, email, "email_verification");

      await db.transaction().execute(async (tx) => {
        await sendVerificationEmail(tx, {
          accountIdentityId: accountIdentity.id,
          config,
          dispatcher,
          email,
          options: { tx },
        });
      });
    }

    return new Response(null, { status: 200 });
  },
);

export default routes;
