import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  FetchTimeoutError,
  fetchWithTimeout,
} from "../../../lib/fetch-with-timeout.ts";
import type { HonoEnv } from "../../../lib/hono-env.ts";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const turnstileVerifyResponseSchema = z.object({
  success: z.boolean(),
  "error-codes": z.array(z.string()).optional(),
});

export async function assertTurnstileToken(
  c: Context<HonoEnv>,
  token: string | undefined,
) {
  const config = c.get("config");

  const secret = config.TURNSTILE_SECRET_KEY;
  if (!secret) return;

  if (!token) {
    throw new HTTPException(400, {
      message: "Captcha is required",
    });
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  const remoteIp = getRemoteIp(c);
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  let response: Response;

  try {
    response = await fetchWithTimeout(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      timeoutMs: 10_000,
    });
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      throw new HTTPException(500, {
        message: "Captcha verification timed out",
      });
    }

    throw error;
  }

  if (!response.ok) {
    throw new HTTPException(500, {
      message: "Captcha verification failed",
      cause: { status: response.status },
    });
  }

  const result = turnstileVerifyResponseSchema.parse(await response.json());

  if (!result.success) {
    const errorCodes = result["error-codes"] ?? [];

    c.get("logger")("warn", "Turnstile verification failed", {
      errorCodes,
    });

    throw new HTTPException(400, {
      message: "Captcha verification failed",
      cause: { errorCodes },
    });
  }
}

function getRemoteIp(c: Context<HonoEnv>) {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
  );
}
