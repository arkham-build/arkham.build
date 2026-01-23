export class ApiError extends Error {
  status: number;
  // biome-ignore lint/suspicious/noExplicitAny: FIXME
  cause?: any;

  constructor(message: string, status: number, cause?: unknown) {
    super(message);
    this.status = status;
    this.cause = cause;
  }
}

export async function apiV2Request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, options);

  if (!res.ok) {
    const err = await res.json();
    throw new ApiError(err.message, res.status, err?.cause);
  }

  return res;
}
