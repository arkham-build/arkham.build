import { z } from "zod";
import { ProjectMetaSchema } from "./fan-made-project.schema.ts";

export const FanMadeProjectInfoSchema = z.object({
  bucket_path: z.string(),
  id: z.string(),
  meta: ProjectMetaSchema,
});

export type FanMadeProjectInfo = z.infer<typeof FanMadeProjectInfoSchema>;
