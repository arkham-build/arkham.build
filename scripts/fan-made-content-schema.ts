import * as z from "zod/v4-mini";
import { FanMadeProjectSchema } from "../src/store/schemas/fan-made-project.schema";

console.log(
  JSON.stringify(
    z.toJSONSchema(FanMadeProjectSchema, {
      metadata: z.globalRegistry,
    }),
    null,
    2,
  ),
);
