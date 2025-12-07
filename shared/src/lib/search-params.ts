import type { ZodType } from "zod";

export function encodeSearch(params: Record<string, unknown>): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v) {
            searchParams.append(key, v.toString());
          }
        });
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams;
}

export function decodeSearch<T>(
  schema: ZodType<T>,
  params: Record<string, string | string[]>,
): T {
  const parsedParams: Record<string, unknown> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length > 1) {
      parsedParams[key] = value;
    } else {
      parsedParams[key] = value[0];
    }
  });

  return schema.parse(parsedParams);
}

export function coerceStringBoolean(
  value: unknown,
): boolean | string | undefined {
  if (value && typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    return false;
  }

  return false;
}

export function coerceStringArray(
  value: unknown,
): string[] | string | undefined {
  if (typeof value === "string") {
    return [value];
  }

  return value as string[] | undefined;
}
