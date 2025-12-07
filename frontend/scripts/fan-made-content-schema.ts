import { z } from "zod";
import { ApiCardSchema } from "../src/store/schemas/card.schema.ts";

// biome-ignore lint/suspicious/noConsole: schema generation script
console.log(
  JSON.stringify(
    z.toJSONSchema(ApiCardSchema, {
      metadata: z.globalRegistry,
    }),
    null,
    2,
  ),
);
