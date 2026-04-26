import {
  type SettingsRequest,
  SettingsRequestSchema,
  type SettingsResponse,
  SettingsResponseSchema,
} from "@arkham-build/shared";
import { ApiError, apiV2Request } from "./shared";

export class SettingsConflictError extends ApiError {
  remote: SettingsResponse | null;

  constructor(error: ApiError) {
    super(error.message, error.status, error.cause);
    this.name = "SettingsConflictError";
    this.remote = parseConflictCause(error.cause);
  }
}

export async function fetchSettings(): Promise<SettingsResponse> {
  const res = await apiV2Request("/v2/settings", {
    credentials: "include",
  });

  return SettingsResponseSchema.parse(await res.json());
}

export async function putSettings(
  payload: SettingsRequest,
): Promise<SettingsResponse> {
  try {
    const res = await apiV2Request("/v2/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(SettingsRequestSchema.parse(payload)),
      credentials: "include",
    });

    return SettingsResponseSchema.parse(await res.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new SettingsConflictError(error);
    }

    throw error;
  }
}

export function isSettingsConflictError(
  error: unknown,
): error is SettingsConflictError {
  return error instanceof SettingsConflictError;
}

function parseConflictCause(cause: unknown): SettingsResponse | null {
  const result = SettingsResponseSchema.safeParse(cause);
  return result.success ? result.data : null;
}
