import { z } from "zod";

const JsonDataPackSchema = z.object({
  code: z.string(),
  cycle_code: z.string(),
  date_release: z.string().nullish(),
  name: z.string(),
  position: z.number(),
  size: z.number().nullish(),
});

export type JsonDataPack = z.infer<typeof JsonDataPackSchema>;

const PackSchema = JsonDataPackSchema.extend({
  icon_url: z.string().nullish(),
  name: z.string().nullish(),
  official: z.boolean().nullish(),
  real_name: z.string(),
  reprint: z
    .object({
      type: z.enum(["player", "encounter", "rcore"]),
    })
    .nullish(),
});

export type Pack = z.infer<typeof PackSchema>;
