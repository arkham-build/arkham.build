import { ApiError, requestApi } from "./requests/shared";

export type UnauthorizedBehavior = "handle" | "ignore";

export type HttpRequestOptions = RequestInit & {
  unauthorizedBehavior?: UnauthorizedBehavior;
};

export type HttpClient = {
  request(path: string, options?: HttpRequestOptions): Promise<Response>;
};

export function createHttpClient(config: {
  apiUrl: string;
  onUnauthorized: () => Promise<void> | void;
}): HttpClient {
  let pendingUnauthorizedHandler: Promise<void> | null = null;

  return {
    async request(path, options = {}) {
      const { unauthorizedBehavior = "handle", ...requestOptions } = options;

      try {
        return await requestApi(config.apiUrl, path, requestOptions);
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          unauthorizedBehavior === "handle"
        ) {
          pendingUnauthorizedHandler ??= Promise.resolve(
            config.onUnauthorized(),
          ).finally(() => {
            pendingUnauthorizedHandler = null;
          });

          await pendingUnauthorizedHandler;
        }

        throw error;
      }
    },
  };
}
