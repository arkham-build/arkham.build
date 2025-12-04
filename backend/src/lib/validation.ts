import { HTTPException } from "hono/http-exception";
import { validator } from "hono/validator";
import type { ZodType } from "zod";

export function zodValidator<T>(type: "json" | "form", schema: ZodType<T>) {
  return validator(type, (value) => {
    const result = schema.safeParse(value);

    if (!result.success) {
      throw new HTTPException(400, {
        cause: result.error,
      });
    }

    return result.data;
  });
}
