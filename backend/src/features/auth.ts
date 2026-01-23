import assert from "node:assert";
import {
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  MeResponseSchema,
  ResendVerificationRequestSchema,
  ResetPasswordRequestSchema,
  SignupRequestSchema,
  VerifyEmailRequestSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { createAccount, getAccount } from "../db/queries/account.ts";
import {
  getAccountIdentity,
  getAccountIdentityByAccountId,
  getAccountIdentityByEmail,
  getAccountIdentityByUsername,
  updateAccountIdentityVerified,
  updatePasswordHash,
} from "../db/queries/account-identity.ts";
import {
  createSession,
  deleteSession,
  deleteSessionsByAccountId,
} from "../db/queries/session.ts";
import {
  consumeVerificationToken,
  createVerificationToken,
  deleteVerificationTokensByEmail,
  getLatestVerificationTokenByEmail,
} from "../db/queries/verification-token.ts";
import {
  generateRandomToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../lib/auth/crypto.ts";
import { sessionAuth } from "../lib/auth/session-auth.ts";
import type { HonoEnv } from "../lib/hono-env.ts";
import { zodValidator } from "../lib/validation.ts";

function isEmail(input: string): boolean {
  return input.includes("@");
}

function assertEmailCooldown(
  tokenCreatedAt: Date,
  cooldownMs = 5 * 60 * 1000,
): void {
  const retryAfter = new Date(tokenCreatedAt.getTime() + cooldownMs);

  if (Date.now() < retryAfter.getTime()) {
    throw new HTTPException(429, {
      message: "Please wait before requesting another email",
      cause: { retryAfter: retryAfter.toISOString() },
    });
  }
}

export function authRouter() {
  const routes = new Hono<HonoEnv>();

  routes.post(
    "/signup",
    zodValidator("json", SignupRequestSchema),
    async (c) => {
      const db = c.get("db");
      const config = c.get("config");
      const emailService = c.get("emailService");

      const { name, email, password } = c.req.valid("json");

      const existingIdentity = await getAccountIdentityByEmail(db, email);

      // This is checked again on the database level.
      // XXX: While this error message is clearer, it potentially allows enumeration of registered emails.
      if (existingIdentity) {
        throw new HTTPException(400, {
          message: "An account is already registered for this email.",
        });
      }

      const passwordHash = await hashPassword(password);

      const { accountIdentity } = await createAccount(db, {
        name,
        email,
        passwordHash,
      });

      const token = generateRandomToken();

      await createVerificationToken(db, {
        accountIdentityId: accountIdentity.id,
        email,
        tokenHash: hashToken(token),
        tokenType: "email_verification",
        expiryHours: config.VERIFICATION_TOKEN_EXPIRY_HOURS,
      });

      await emailService.sendVerificationEmail(email, token);

      return new Response(null, { status: 201 });
    },
  );

  routes.post("/login", zodValidator("json", LoginRequestSchema), async (c) => {
    const db = c.get("db");
    const config = c.get("config");

    const { email, password } = c.req.valid("json");

    const accountIdentity = await getAccountIdentityByEmail(db, email);

    if (
      !accountIdentity ||
      !accountIdentity.password_hash ||
      !accountIdentity.email
    ) {
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
        message: "Account not verified",
      });
    }

    const account = await getAccount(db, accountIdentity.account_id);
    assert(account, "Account should exist for valid account identity");

    const session = await createSession(
      db,
      account.id,
      config.SESSION_EXPIRY_HOURS,
    );

    setCookie(c, config.SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: config.SESSION_EXPIRY_HOURS * 60 * 60,
      path: "/",
    });

    return new Response(null, { status: 200 });
  });

  routes.post("/logout", sessionAuth(), async (c) => {
    const db = c.get("db");
    const config = c.get("config");
    const sessionId = getCookie(c, config.SESSION_COOKIE_NAME);

    if (sessionId) {
      await deleteSession(db, sessionId);
    }

    deleteCookie(c, config.SESSION_COOKIE_NAME);

    return new Response(null, { status: 200 });
  });

  routes.get("/me", sessionAuth(), async (c) => {
    const db = c.get("db");
    const account = c.get("account");
    assert(account, "Account should be set by middleware");

    const accountIdentity = await getAccountIdentityByAccountId(db, account.id);

    return c.json(
      MeResponseSchema.parse({
        account: {
          id: account.id,
          name: account.name,
          email: accountIdentity?.email ?? null,
        },
      }),
    );
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
      const emailService = c.get("emailService");

      const accountIdentity = await getAccountIdentityByEmail(db, email);

      if (accountIdentity && !accountIdentity.verified_at) {
        const latestToken = await getLatestVerificationTokenByEmail(
          db,
          email,
          "email_verification",
        );

        if (latestToken) {
          assertEmailCooldown(latestToken.created_at);
        }

        const token = generateRandomToken();
        const tokenHash = hashToken(token);

        await db.transaction().execute(async (tx) => {
          await deleteVerificationTokensByEmail(
            tx,
            email,
            "email_verification",
          );

          await createVerificationToken(tx, {
            accountIdentityId: accountIdentity.id,
            email,
            tokenHash,
            tokenType: "email_verification",
            expiryHours: config.VERIFICATION_TOKEN_EXPIRY_HOURS,
          });
        });

        await emailService.sendVerificationEmail(email, token);
      }

      return new Response(null, { status: 200 });
    },
  );

  routes.post(
    "/forgot-password",
    zodValidator("json", ForgotPasswordRequestSchema),
    async (c) => {
      const { emailOrUsername } = c.req.valid("json");
      const db = c.get("db");
      const config = c.get("config");
      const emailService = c.get("emailService");

      const accountIdentity = isEmail(emailOrUsername)
        ? await getAccountIdentityByEmail(db, emailOrUsername)
        : await getAccountIdentityByUsername(db, emailOrUsername);

      const email = accountIdentity?.email;

      if (accountIdentity?.verified_at && email) {
        const latestToken = await getLatestVerificationTokenByEmail(
          db,
          email,
          "password_reset",
        );

        if (latestToken) {
          assertEmailCooldown(latestToken.created_at);
        }

        await deleteVerificationTokensByEmail(db, email, "password_reset");

        const token = generateRandomToken();
        const tokenHash = hashToken(token);

        await createVerificationToken(db, {
          accountIdentityId: accountIdentity.id,
          email,
          tokenHash,
          tokenType: "password_reset",
          expiryHours: config.PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
        });

        await emailService.sendPasswordResetEmail(email, token);
      }

      return new Response(null, { status: 200 });
    },
  );

  routes.post(
    "/reset-password",
    zodValidator("json", ResetPasswordRequestSchema),
    async (c) => {
      const { token, password } = c.req.valid("json");
      const db = c.get("db");

      const passwordHash = await hashPassword(password);

      await db.transaction().execute(async (tx) => {
        const verificationToken = await consumeVerificationToken(
          tx,
          hashToken(token),
          "password_reset",
        );

        if (!verificationToken?.account_identity_id) {
          throw new HTTPException(400, {
            message: "Invalid or expired password reset token",
          });
        }

        const accountIdentity = await getAccountIdentity(
          tx,
          verificationToken.account_identity_id,
        );

        if (!accountIdentity) {
          throw new HTTPException(400, {
            message: "Invalid or expired password reset token",
          });
        }

        await updatePasswordHash(
          tx,
          verificationToken.account_identity_id,
          passwordHash,
        );

        await deleteSessionsByAccountId(tx, accountIdentity.account_id);
      });

      return new Response(null, { status: 200 });
    },
  );

  return routes;
}
