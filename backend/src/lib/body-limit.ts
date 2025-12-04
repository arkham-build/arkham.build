import { bodyLimit } from "hono/body-limit";

export function bodyLimitMiddleware() {
  return bodyLimit({
    maxSize: 500 * 1024, // 500kb
    onError: (c) => {
      c.status(413);
      return c.json({ message: "Request body is too large." });
    },
  });
}
