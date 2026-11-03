import type { z } from "zod";
import type { HttpClient } from "../http-client";
import { ApiError } from "./shared";

export function createRevisionedAccountStateClient<Request, Response>(config: {
  path: string;
  requestSchema: z.ZodType<Request>;
  responseSchema: z.ZodType<Response>;
  conflictErrorName: string;
}) {
  class ConflictError extends ApiError {
    remote: Response | null;

    constructor(error: ApiError) {
      super(error.message, error.status, error.cause);
      this.name = config.conflictErrorName;
      const result = config.responseSchema.safeParse(error.cause);
      this.remote = result.success ? result.data : null;
    }
  }

  async function fetchState(client: HttpClient): Promise<Response> {
    const res = await client.request(config.path, {
      credentials: "include",
    });

    return config.responseSchema.parse(await res.json());
  }

  async function putState(
    client: HttpClient,
    payload: Request,
  ): Promise<Response> {
    try {
      const res = await client.request(config.path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config.requestSchema.parse(payload)),
        credentials: "include",
      });

      return config.responseSchema.parse(await res.json());
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        throw new ConflictError(error);
      }

      throw error;
    }
  }

  function isConflictError(error: unknown): error is ConflictError {
    return error instanceof ConflictError;
  }

  return { fetch: fetchState, put: putState, isConflictError };
}
