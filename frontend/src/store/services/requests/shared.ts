export class ApiError extends Error {
  status: number;
  override cause?: unknown;

  constructor(message: string, status: number, cause?: unknown) {
    super(message);
    this.status = status;
    this.cause = cause;
  }
}

export async function requestApi(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${baseUrl}${path}`, options);

  if (!res.ok) {
    throw await createApiError(res);
  }

  return res;
}

async function createApiError(res: Response): Promise<ApiError> {
  const payload = await parseErrorPayload(res);
  const message = getErrorMessage(payload, res.statusText);
  const cause = getErrorCause(payload);

  return new ApiError(message, res.status, cause);
}

async function parseErrorPayload(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await res.text();
    return text ? { message: text } : null;
  } catch {
    return null;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return fallback || "Request failed";
}

function getErrorCause(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "cause" in payload) {
    return payload.cause;
  }

  return undefined;
}
