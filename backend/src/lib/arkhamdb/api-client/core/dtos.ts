import { DeckProblemSchema, SlotsSchema } from "@arkham-build/shared";
import { z } from "zod";

const SafeSlotsSchema = z.preprocess(
  (value) => (Array.isArray(value) ? {} : value),
  SlotsSchema.nullish(),
);

const SafeRequiredSlotsSchema = z.preprocess(
  (value) => (Array.isArray(value) ? {} : value),
  SlotsSchema,
);

export const ArkhamDbRemoteDeckSchema = z.object({
  date_creation: z.string().nullish(),
  date_update: z.string().nullish(),
  description_md: z.string().nullish(),
  exile_string: z.string().nullish(),
  id: z.number(),
  ignoreDeckLimitSlots: SafeSlotsSchema,
  investigator_code: z.string(),
  investigator_name: z.string().nullish(),
  meta: z.string(),
  name: z.string(),
  problem: z.union([DeckProblemSchema, z.string()]).nullish(),
  sideSlots: SafeSlotsSchema,
  slots: SafeRequiredSlotsSchema,
  taboo: z.number().nullish(),
  tags: z.string().nullish(),
  user_id: z.number().nullish(),
  version: z.string(),
  xp: z.number().nullish(),
  xp_adjustment: z.number().nullish(),
  xp_spent: z.number().nullish(),
  previous_deck: z.number().nullish(),
  next_deck: z.number().nullish(),
});

export type ArkhamDbRemoteDeck = z.infer<typeof ArkhamDbRemoteDeckSchema>;

export const ArkhamDbRemoteDecksSchema = z.array(ArkhamDbRemoteDeckSchema);

export const ArkhamDbOperationResponseSchema = z.object({
  msg: z.union([z.string(), z.number()]),
  success: z.boolean(),
});

export const ArkhamDbSuccessResponseSchema = z.object({
  msg: z.union([z.string(), z.number()]).nullish(),
  success: z.boolean(),
});

export type ArkhamDbOperationResponse = z.infer<
  typeof ArkhamDbOperationResponseSchema
>;

export type ArkhamDbSuccessResponse = z.infer<
  typeof ArkhamDbSuccessResponseSchema
>;
