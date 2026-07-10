import { z } from "zod";
import { ApiCardSchema } from "../../shared/src/index";

// oxlint-disable-next-line no-console -- schema generation script
console.log(
  JSON.stringify(
    z.toJSONSchema(ApiCardSchema, {
      metadata: z.globalRegistry,
    }),
    null,
    2,
  ),
);
