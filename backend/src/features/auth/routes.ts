import assert from "node:assert";
import {
  CompleteProfileRequestSchema,
  CreateEmailIdentityRequestSchema,
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  ResendVerificationRequestSchema,
  ResetPasswordRequestSchema,
  SessionResponseSchema,
  SignupRequestSchema,
  UpdateCredentialsRequestSchema,
  VerifyEmailRequestSchema,
} from "@arkham-build/shared";
import { type Context, Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { Database } from "../../db/db.ts";
import type { HonoEnv } from "../../lib/hono-env.ts";
import { isEmpty } from "../../lib/is-empty.ts";
import { zodValidator } from "../../lib/validation.ts";
import {
  authorize,
  exchangeAuthCodeForToken,
  fetchUserDecksForOAuth,
  getOAuthContext,
  OAuthError,
  validateOAuthState,
} from "./arkhamdb-oauth.ts";
import {
  generateRandomToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "./crypto.ts";
import {
  passwordResetEmailTemplate,
  verificationEmailTemplate,
} from "./email-templates.ts";
import {
  accountNameExists,
  activatePendingAccountIdentityEmail,
  connectOAuthIdentityToAccount,
  consumeVerificationToken,
  countUsableLoginIdentities,
  createAccount,
  createEmailIdentity,
  createSession,
  deleteEmailIdentity,
  deleteSession,
  deleteSessionsByAccountId,
  deleteVerificationTokensByAccountIdentityIdAndEmail,
  disconnectOAuthIdentity,
  getAccount,
  getAccountIdentity,
  getAccountIdentityByAccountIdAndProvider,
  getAccountIdentityByEmail,
  getAccountIdentityByProviderUserId,
  getAccountIdentityByUsername,
  getIdentitiesByAccountId,
  getLatestVerificationTokenByEmail,
  getVerificationTokenByHash,
  replaceVerificationToken,
  updateAccountIdentityPasswordHash,
  updateAccountIdentityPendingEmail,
  updateAccountIdentityVerified,
  updateAccountName,
  upsertAccountFromOAuth,
} from "./queries.ts";
import { sessionAuth } from "./session-auth-middleware.ts";

const routes = new Hono<HonoEnv>();

routes.post("/signup", zodValidator("json", SignupRequestSchema), async (c) => {
  const db = c.get("db");
  const config = c.get("config");
  const emailService = c.get("emailService");

  const { name, email, password } = c.req.valid("json");

  if (await accountNameExists(db, name)) {
    throw new HTTPException(400, {
      message: "Username is already taken",
    });
  }

  // This is checked again on the database level.
  // XXX: While this error message is clearer, it potentially allows enumeration of registered emails.
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

    await emailService.sendTemplate(
      verificationEmailTemplate({
        token,
        verificationUrl: `${config.FRONTEND_URL}/auth/verify-email?token=${token}`,
      }),
      email,
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
  const identities = await getIdentitiesByAccountId(db, account.id);

  return c.json(
    SessionResponseSchema.parse({
      account: {
        id: account.id,
        name: account.name,
      },
      identities,
    }),
  );
});

routes.post(
  "/email",
  sessionAuth(),
  zodValidator("json", CreateEmailIdentityRequestSchema),
  async (c) => {
    const db = c.get("db");
    const config = c.get("config");
    const account = c.get("account");
    const { email, password } = c.req.valid("json");

    const existingEmailIdentity =
      await getAccountIdentityByAccountIdAndProvider(db, account.id, "email");

    if (existingEmailIdentity) {
      throw new HTTPException(400, {
        message: "Email identity already exists",
      });
    }

    await assertEmailAvailable(db, email);

    await assertVerificationTokenCooldown(db, email, "email_verification");

    const token = generateRandomToken();
    const passwordHash = await hashPassword(password);

    await db.transaction().execute(async (tx) => {
      const accountIdentity = await createEmailIdentity(
        tx,
        account.id,
        email,
        passwordHash,
      );

      await replaceVerificationToken(tx, {
        accountIdentityId: accountIdentity.id,
        email,
        tokenHash: hashToken(token),
        tokenType: "email_verification",
        expiryHours: config.VERIFICATION_TOKEN_EXPIRY_HOURS,
      });

      await c.get("emailService").sendTemplate(
        verificationEmailTemplate({
          token,
          verificationUrl: `${config.FRONTEND_URL}/auth/verify-email?token=${token}`,
        }),
        email,
      );
    });

    return new Response(null, { status: 201 });
  },
);

routes.patch(
  "/credentials",
  sessionAuth(),
  zodValidator("json", UpdateCredentialsRequestSchema),
  async (c) => {
    const db = c.get("db");
    const config = c.get("config");
    const account = c.get("account");
    const { currentPassword, newEmail, newPassword } = c.req.valid("json");

    const emailIdentity = await getAccountIdentityByAccountIdAndProvider(
      db,
      account.id,
      "email",
    );

    if (!emailIdentity?.email || !emailIdentity.password_hash) {
      throw new HTTPException(400, {
        message: "Email identity not found",
      });
    }

    const isPasswordValid = await verifyPassword(
      currentPassword,
      emailIdentity.password_hash,
    );

    if (!isPasswordValid) {
      throw new HTTPException(400, {
        message: "Current password is incorrect",
      });
    }

    const nextEmail =
      newEmail && newEmail !== emailIdentity.email ? newEmail : undefined;

    if (nextEmail) {
      await assertEmailAvailable(db, nextEmail, emailIdentity.id);

      await assertVerificationTokenCooldown(
        db,
        nextEmail,
        "email_verification",
      );
    }

    if (!nextEmail && !newPassword) {
      throw new HTTPException(400, {
        message: "No credential changes requested",
      });
    }

    const token = nextEmail ? generateRandomToken() : null;
    const passwordHash = newPassword ? await hashPassword(newPassword) : null;
    const previousPendingEmail = emailIdentity.pending_email;

    await db.transaction().execute(async (tx) => {
      if (passwordHash) {
        await updateAccountIdentityPasswordHash(
          tx,
          emailIdentity.id,
          passwordHash,
        );
      }

      if (!nextEmail || !token) {
        return;
      }

      if (previousPendingEmail && previousPendingEmail !== nextEmail) {
        await deleteVerificationTokensByAccountIdentityIdAndEmail(
          tx,
          emailIdentity.id,
          previousPendingEmail,
          "email_verification",
        );
      }

      await updateAccountIdentityPendingEmail(tx, emailIdentity.id, nextEmail);
      await replaceVerificationToken(tx, {
        accountIdentityId: emailIdentity.id,
        email: nextEmail,
        tokenHash: hashToken(token),
        tokenType: "email_verification",
        expiryHours: config.VERIFICATION_TOKEN_EXPIRY_HOURS,
      });
      await c.get("emailService").sendTemplate(
        verificationEmailTemplate({
          token,
          verificationUrl: `${config.FRONTEND_URL}/auth/verify-email?token=${token}`,
        }),
        nextEmail,
      );
    });

    return new Response(null, { status: 200 });
  },
);

routes.delete("/credentials/pending-email", sessionAuth(), async (c) => {
  const db = c.get("db");
  const account = c.get("account");

  const emailIdentity = await getAccountIdentityByAccountIdAndProvider(
    db,
    account.id,
    "email",
  );

  if (!emailIdentity) {
    throw new HTTPException(400, {
      message: "Email identity not found",
    });
  }

  const pendingEmail = emailIdentity.pending_email;

  if (!pendingEmail) {
    throw new HTTPException(400, {
      message: "No pending email found",
    });
  }

  await db.transaction().execute(async (tx) => {
    await deleteVerificationTokensByAccountIdentityIdAndEmail(
      tx,
      emailIdentity.id,
      pendingEmail,
      "email_verification",
    );

    if (emailIdentity.email) {
      await updateAccountIdentityPendingEmail(tx, emailIdentity.id, null);
      return;
    }

    await deleteEmailIdentity(tx, emailIdentity.id);
  });

  return new Response(null, { status: 200 });
});

routes.delete("/oauth/:provider", sessionAuth(), async (c) => {
  const db = c.get("db");
  const account = c.get("account");
  const provider = c.req.param("provider");

  if (provider === "email") {
    throw new HTTPException(400, {
      message: "Email identity cannot be disconnected",
    });
  }

  const oauthIdentity = await getAccountIdentityByAccountIdAndProvider(
    db,
    account.id,
    provider,
  );

  if (!oauthIdentity) {
    throw new HTTPException(404, {
      message: "OAuth identity not found",
    });
  }

  const usableLoginIdentityCount = await countUsableLoginIdentities(
    db,
    account.id,
  );

  if (usableLoginIdentityCount <= 1) {
    throw new HTTPException(400, {
      message: "Account must have at least one login identity",
    });
  }

  await disconnectOAuthIdentity(db, account.id, provider);

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
        await c.get("emailService").sendTemplate(
          verificationEmailTemplate({
            token,
            verificationUrl: `${config.FRONTEND_URL}/auth/verify-email?token=${token}`,
          }),
          email,
        );
      });
    }

    return new Response(null, { status: 200 });
  },
);

routes.post(
  "/forgot-password",
  zodValidator("json", ForgotPasswordRequestSchema),
  async (c) => {
    const { emailOrUsername } = c.req.valid("json");
    const config = c.get("config");
    const db = c.get("db");

    const accountIdentity = isEmail(emailOrUsername)
      ? await getAccountIdentityByEmail(db, emailOrUsername)
      : await getAccountIdentityByUsername(db, "email", emailOrUsername);

    const email = accountIdentity?.email;

    if (accountIdentity?.verified_at && email) {
      await assertVerificationTokenCooldown(db, email, "password_reset");

      const token = generateRandomToken();

      await db.transaction().execute(async (tx) => {
        await replaceVerificationToken(tx, {
          accountIdentityId: accountIdentity.id,
          email,
          tokenHash: hashToken(token),
          tokenType: "password_reset",
          expiryHours: config.PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
        });

        await c.get("emailService").sendTemplate(
          passwordResetEmailTemplate({
            resetUrl: `${config.FRONTEND_URL}/auth/reset-password#token=${encodeURIComponent(
              token,
            )}`,
          }),
          email,
        );
      });
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

    const tokenHash = hashToken(token);

    const existingToken = await getVerificationTokenByHash(
      db,
      tokenHash,
      "password_reset",
    );

    if (!existingToken?.account_identity_id) {
      throwInvalidResetToken();
    }

    const passwordHash = await hashPassword(password);

    await db.transaction().execute(async (tx) => {
      const verificationToken = await consumeVerificationToken(
        tx,
        tokenHash,
        "password_reset",
      );

      if (!verificationToken?.account_identity_id) {
        throwInvalidResetToken();
      }

      const accountIdentity = await getAccountIdentity(
        tx,
        verificationToken.account_identity_id,
      );

      if (!accountIdentity) {
        throwInvalidResetToken();
      }

      await updateAccountIdentityPasswordHash(
        tx,
        verificationToken.account_identity_id,
        passwordHash,
      );

      await deleteSessionsByAccountId(tx, accountIdentity.account_id);
    });

    return new Response(null, { status: 200 });
  },
);

// Separate since we need to mount it at root
export const arkhamdbOAuthRoutes = new Hono<HonoEnv>();

arkhamdbOAuthRoutes.get("/", (c) =>
  authorize(c, {
    intent: "login",
    returnTo: "/auth/login",
  }),
);

arkhamdbOAuthRoutes.get("/login", (c) =>
  authorize(c, {
    intent: "login",
    returnTo: "/auth/login",
  }),
);

arkhamdbOAuthRoutes.get("/signup", (c) =>
  authorize(c, {
    intent: "signup",
    returnTo: "/auth/signup",
  }),
);

arkhamdbOAuthRoutes.get("/connect", sessionAuth(), (c) =>
  authorize(c, {
    accountId: c.get("account").id,
    intent: "connect",
    returnTo: "/settings?tab=account",
  }),
);

arkhamdbOAuthRoutes.get("/callback", async (c) => {
  const db = c.get("db");
  const config = c.get("config");
  const code = c.req.query("code");
  const state = c.req.query("state");
  const oauthContext = await getOAuthContext(c);

  const returnTo = oauthContext?.returnTo ?? "/auth/login";

  try {
    if (!code) {
      throw new OAuthError("oauth_missing_code");
    }

    const validatedOAuthContext = await validateOAuthState(c, state);
    const accessToken = await exchangeAuthCodeForToken(c, code);
    const decks = await fetchUserDecksForOAuth(c, accessToken.access_token);

    if (isEmpty(decks)) {
      throw new OAuthError("arkhamdb_no_decks");
    }

    const firstDeck = decks[0];
    if (!firstDeck?.user_id) {
      throw new OAuthError("arkhamdb_invalid_response");
    }

    const providerUserId = firstDeck.user_id.toString();

    if (validatedOAuthContext.intent === "connect") {
      assert(
        validatedOAuthContext.accountId,
        "Missing account ID for OAuth connect.",
      );

      const existingIdentity = await getAccountIdentityByProviderUserId(
        db,
        "arkhamdb",
        providerUserId,
      );

      if (
        existingIdentity &&
        existingIdentity.account_id !== validatedOAuthContext.accountId
      ) {
        throw new OAuthError("identity_belongs_to_another_account");
      }

      await connectOAuthIdentityToAccount(db, {
        accountId: validatedOAuthContext.accountId,
        accessToken,
        provider: "arkhamdb",
        providerUserId,
      });

      return c.redirect(
        `${config.FRONTEND_URL}${validatedOAuthContext.returnTo}`,
      );
    }

    const { existing, session } = await upsertAccountFromOAuth(db, {
      accessToken,
      config,
      provider: "arkhamdb",
      providerUserId,
    });

    setSessionCookie(c, session.id);
    const path = existing ? "/" : "/auth/signup/complete";
    return c.redirect(`${config.FRONTEND_URL}${path}`);
  } catch (error) {
    const logger = c.get("logger");
    logger("warn", (error as Error).message);
    return redirectToOAuthError(
      c,
      returnTo,
      getOAuthErrorCode(error, oauthContext?.intent),
    );
  }
});

routes.post(
  "/complete-profile",
  sessionAuth(),
  zodValidator("json", CompleteProfileRequestSchema),
  async (c) => {
    const db = c.get("db");
    const account = c.get("account");

    const { username } = c.req.valid("json");

    await db.transaction().execute(async (tx) => {
      if (await accountNameExists(tx, username, account.id)) {
        throw new HTTPException(400, {
          message: "Username is already taken",
        });
      }

      await updateAccountName(tx, account.id, username);
    });

    return new Response(null, { status: 200 });
  },
);

export default routes;

function throwInvalidResetToken(): never {
  throw new HTTPException(400, {
    message: "Invalid or expired password reset token",
  });
}

async function assertEmailAvailable(
  db: Database,
  email: string,
  excludeAccountIdentityId?: string,
): Promise<void> {
  const existingEmailIdentity = await getAccountIdentityByEmail(db, email);

  if (
    existingEmailIdentity &&
    existingEmailIdentity.id !== excludeAccountIdentityId
  ) {
    throw new HTTPException(400, {
      message: "An account is already registered for this email",
    });
  }
}

async function assertVerificationTokenCooldown(
  db: Database,
  email: string,
  tokenType: "email_verification" | "password_reset",
): Promise<void> {
  const latestToken = await getLatestVerificationTokenByEmail(
    db,
    email,
    tokenType,
  );

  if (latestToken) {
    assertEmailCooldown(latestToken.created_at);
  }
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

function isEmail(input: string): boolean {
  return input.includes("@");
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function setSessionCookie(c: Context<HonoEnv>, sessionId: string): void {
  const config = c.get("config");

  setCookie(c, config.SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: config.SESSION_EXPIRY_HOURS * 60 * 60,
    path: "/",
  });
}

function redirectToOAuthError(
  c: Context<HonoEnv>,
  returnTo: string,
  errorCode: string,
) {
  const url = new URL(returnTo, c.get("config").FRONTEND_URL);
  url.searchParams.set("oauth_error", errorCode);
  return c.redirect(url.toString());
}

function getOAuthErrorCode(
  error: unknown,
  _intent: "login" | "signup" | "connect" | undefined,
) {
  if (error instanceof OAuthError) {
    switch (error.code) {
      case "oauth_missing_code":
      case "arkhamdb_no_decks":
      case "arkhamdb_invalid_response":
      case "invalid_state":
      case "identity_belongs_to_another_account":
        return error.code;
      default:
        return "oauth_failed";
    }
  }

  return "oauth_failed";
}
