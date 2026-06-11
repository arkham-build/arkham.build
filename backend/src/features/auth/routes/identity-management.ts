import {
  CreateEmailIdentityRequestSchema,
  UpdateCredentialsRequestSchema,
} from "@arkham-build/shared";
import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import {
  getAccountIdentityByAccountIdAndProvider,
  listAccountIdentitiesByAccountId,
} from "../../../lib/auth/account-identities.ts";
import { deleteAccountById } from "../../../lib/auth/accounts.ts";
import { sessionAuth } from "../../../lib/auth/session-auth-middleware.ts";
import { isUniqueViolation } from "../../../lib/db-errors.ts";
import type { HonoEnv } from "../../../lib/hono-env.ts";
import { zodValidator } from "../../../lib/validation.ts";
import {
  assertEmailAvailable,
  assertVerificationTokenCooldown,
} from "../lib/assertions.ts";
import { hashPassword, verifyPassword } from "../lib/crypto.ts";
import { mapAccountSessionToResponse } from "../lib/mapping.ts";
import { sendVerificationEmail } from "../lib/verification-email.ts";
import {
  countUsableLoginIdentities,
  createEmailIdentity,
  deleteEmailIdentity,
  disconnectOAuthIdentity,
  updateAccountIdentityPasswordHash,
  updateAccountIdentityPendingEmail,
} from "../queries/identities.ts";
import { deleteVerificationTokensByAccountIdentityIdAndEmail } from "../queries/verification-tokens.ts";

const routes = new Hono<HonoEnv>();

routes.delete(
  "/account",
  sessionAuth({ requireCompleteProfile: false }),
  async (c) => {
    const db = c.get("db");
    const config = c.get("config");
    const account = c.get("account");

    c.set("skipSessionCookieRefresh", true);

    await deleteAccountById(db, account.id);
    deleteCookie(c, config.SESSION_COOKIE_NAME, { path: "/" });

    return new Response(null, { status: 204 });
  },
);

routes.get("/me", sessionAuth({ requireCompleteProfile: false }), async (c) => {
  const db = c.get("db");
  const account = c.get("account");
  const identities = await listAccountIdentitiesByAccountId(db, account.id);
  const canDisconnectOAuthIdentity =
    (await countUsableLoginIdentities(db, account.id)) > 1;

  return c.json(
    mapAccountSessionToResponse(
      account,
      identities,
      canDisconnectOAuthIdentity,
    ),
  );
});

routes.post(
  "/email",
  sessionAuth(),
  zodValidator("json", CreateEmailIdentityRequestSchema),
  async (c) => {
    const db = c.get("db");
    const config = c.get("config");
    const dispatcher = c.get("dispatcher");
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

    const passwordHash = await hashPassword(password);

    try {
      await db.transaction().execute(async (tx) => {
        const accountIdentity = await createEmailIdentity(
          tx,
          account.id,
          email,
          passwordHash,
        );

        await sendVerificationEmail(tx, {
          accountIdentityId: accountIdentity.id,
          config,
          dispatcher,
          email,
          options: { tx },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HTTPException(400, {
          message: "An account is already registered for this email",
        });
      }

      throw error;
    }

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
    const dispatcher = c.get("dispatcher");
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

    const passwordHash = newPassword ? await hashPassword(newPassword) : null;
    const previousPendingEmail = emailIdentity.pending_email;

    try {
      await db.transaction().execute(async (tx) => {
        if (passwordHash) {
          await updateAccountIdentityPasswordHash(
            tx,
            emailIdentity.id,
            passwordHash,
          );
        }

        if (!nextEmail) {
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

        await updateAccountIdentityPendingEmail(
          tx,
          emailIdentity.id,
          nextEmail,
        );
        await sendVerificationEmail(tx, {
          accountIdentityId: emailIdentity.id,
          config,
          dispatcher,
          email: nextEmail,
          options: { tx },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HTTPException(400, {
          message: "An account is already registered for this email",
        });
      }

      throw error;
    }

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

  await db.transaction().execute(async (tx) => {
    const usableLoginIdentityCount = await countUsableLoginIdentities(
      tx,
      account.id,
    );

    if (usableLoginIdentityCount <= 1) {
      throw new HTTPException(400, {
        message: "Account must have at least one login identity",
      });
    }

    await disconnectOAuthIdentity(tx, account.id, provider);
  });

  return new Response(null, { status: 200 });
});

export default routes;
