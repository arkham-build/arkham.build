import { z } from "zod";

export const OAuthUserErrorSchema = z
  .object({
    error: z.enum(["invalid_token", "insufficient_scope", "account_banned"]),
    message: z.string(),
  })
  .strict();

export const OAuthProfileResponseSchema = z
  .object({
    id: z.uuid(),
    username: z.string(),
  })
  .strict();
