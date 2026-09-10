import { z } from "zod";
import { PATTERN_VALID_USERNAME } from "./auth.schema.ts";

export const UpdateProfileRequestSchema = z.object({
  username: z.string().min(3).max(64).regex(new RegExp(PATTERN_VALID_USERNAME)),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
