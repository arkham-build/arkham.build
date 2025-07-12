import * as z from "zod/v4-mini";

const JsonDataPackSchema = z.object({
  code: z.string(),
  cycle_code: z.string(),
  date_release: z.optional(z.string()),
  name: z.string(),
  position: z.number(),
  size: z.optional(z.number()),
});

export type JsonDataPack = z.infer<typeof JsonDataPackSchema>;

const PackSchema = z.extend(JsonDataPackSchema, {
  icon_url: z.optional(z.string()),
  name: z.optional(z.string()),
  official: z.optional(z.boolean()),
  real_name: z.string(),
  reprint: z.optional(
    z.object({
      type: z.enum(["player", "encounter", "rcore"]),
    }),
  ),
});

export type Pack = z.infer<typeof PackSchema>;
