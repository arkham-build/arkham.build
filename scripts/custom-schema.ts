import * as z from "@zod/mini";
import { CustomContentProjectSchema } from "../src/store/lib/custom-content.schemas";

console.log(
  JSON.stringify(
    z.toJSONSchema(CustomContentProjectSchema, {
      metadata: z.globalRegistry,
    }),
    null,
    2,
  ),
);
