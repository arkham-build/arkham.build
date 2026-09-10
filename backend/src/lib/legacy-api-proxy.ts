import type { Context } from "hono";
import type { HonoEnv } from "./hono-env.ts";

export async function proxyLegacyApiRequest(c: Context<HonoEnv>) {
  const incomingUrl = new URL(c.req.url);
  const upstreamUrl = new URL(
    `${incomingUrl.pathname}${incomingUrl.search}`,
    c.get("config").LEGACY_API_BASE_URL,
  );

  const init: RequestInit & { duplex?: "half" } = {
    headers: proxyHeaders(c.req.raw.headers),
    method: c.req.method,
    redirect: "manual",
  };

  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    init.body = c.req.raw.body;
    init.duplex = "half";
  }

  const res = await fetch(upstreamUrl, init);
  return new Response(res.body, {
    headers: proxyHeaders(res.headers),
    status: res.status,
    statusText: res.statusText,
  });
}

function proxyHeaders(headers: Headers) {
  const next = new Headers(headers);

  for (const header of HOP_BY_HOP_HEADERS) {
    next.delete(header);
  }

  return next;
}

const HOP_BY_HOP_HEADERS = [
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];
