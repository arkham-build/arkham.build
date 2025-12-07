import { z } from "zod";

export const DateRangeSchema = z
  .tuple([z.string(), z.string()])
  .optional()
  .default(
    () =>
      [
        "2016-09",
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          .toISOString()
          .slice(0, 7),
      ] as [string, string],
  );

export type DateRange = z.infer<typeof DateRangeSchema>;
