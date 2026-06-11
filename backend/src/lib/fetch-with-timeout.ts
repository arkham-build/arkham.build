export class FetchTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Fetch timed out after ${timeoutMs}ms`);
    this.name = "FetchTimeoutError";
  }
}

const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

export async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: NonNullable<Parameters<typeof fetch>[1]> & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal, ...fetchInit } = init;
  const controller = new AbortController();
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abort = () => controller.abort();

  if (signal?.aborted) {
    abort();
  } else {
    signal?.addEventListener("abort", abort, { once: true });
  }

  try {
    return await fetch(input, {
      ...fetchInit,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new FetchTimeoutError(timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
