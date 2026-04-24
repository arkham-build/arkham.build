import { z } from "zod";
import { ApiCardSchema } from "../../shared/src/index";

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
