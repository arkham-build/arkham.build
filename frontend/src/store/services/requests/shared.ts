export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiV2Request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(
    `${import.meta.env.VITE_RECOMMENDATION_API_URL}${path}`,
    options,
  );

  if (!res.ok) {
    const err = await res.json();
    throw new ApiError(err.message, res.status);
  }

  return res;
}
