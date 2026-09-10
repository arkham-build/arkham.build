import { z } from "zod";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const ArkhamDBApiErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
});

export const OAuthErrorResponseSchema = z.object({
  error: z.string(),
  error_description: z.string(),
});

export type ArkhamDBApiError = z.infer<typeof ArkhamDBApiErrorSchema>;
export type OAuthErrorResponse = z.infer<typeof OAuthErrorResponseSchema>;

export function isArkhamDBApiError(value: unknown): value is ArkhamDBApiError {
  return ArkhamDBApiErrorSchema.safeParse(value).success;
}

export function isOAuthErrorResponse(
  value: unknown,
): value is OAuthErrorResponse {
  return OAuthErrorResponseSchema.safeParse(value).success;
}
