import { HTTPException } from "hono/http-exception";

export function getExternalAuthConnectReturnTo(returnTo: string | undefined) {
  if (!returnTo) return "/settings?tab=account";

  if (!returnTo.startsWith("/")) {
    throw new HTTPException(400, { message: "Invalid returnTo" });
  }

  const url = new URL(returnTo, "http://internal");
  if (url.origin !== "http://internal") {
    throw new HTTPException(400, { message: "Invalid returnTo" });
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
