export function mergeHeaders(...sources: RequestInit["headers"][]): Headers {
  const headers = new Headers();

  for (const source of sources) {
    if (!source) continue;

    new Headers(source).forEach((value, name) => {
      headers.set(name, value);
    });
  }

  return headers;
}

export function baseHeaders(method = "GET"): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "api.arkham.build (https://arkham.build)",
  };

  if (method === "POST" || method === "PUT") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  return headers;
}
