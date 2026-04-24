import { z } from "zod";

export const JsonDataPackSchema = z.object({
  chapter: z.number().nullish(),
  code: z.string(),
  cycle_code: z.string(),
  date_release: z.string().nullish(),
  name: z.string(),
  position: z.number(),
  size: z.number().nullish(),
  reprint_type: z.enum(["campaign", "player", "rcore"]).nullish(),
  reprint_packs: z.array(z.string()).nullish(),
  type: z.string().nullish(),
});

export type JsonDataPack = z.infer<typeof JsonDataPackSchema>;
