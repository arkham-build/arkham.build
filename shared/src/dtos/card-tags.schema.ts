import { z } from "zod";

export const CARD_TAG_FAVORITE_ID = "favorite";
export const CARD_TAG_ASSIGNMENTS_MAX_COUNT = 10_000;
export const CARD_TAG_NAME_MAX_LENGTH = 255;
export const CARD_TAGS_MAX_COUNT = 1_000;

export const CardTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(CARD_TAG_NAME_MAX_LENGTH);

export type CardTag = z.infer<typeof CardTagSchema>;

export const CardTagsStateSchema = z
  .object({
    tags: z.array(CardTagSchema).max(CARD_TAGS_MAX_COUNT),
    cardTags: z.record(z.string().min(1).max(255), z.array(CardTagSchema)),
    favorites: z.record(z.string().min(1).max(255), z.literal(true)),
  })
  .superRefine(validateCardTagsState);

export type CardTagsState = z.infer<typeof CardTagsStateSchema>;

function validateCardTagsState(
  state: CardTagsState,
  ctx: z.core.$RefinementCtx<CardTagsState>,
) {
  const tagNames = new Set(state.tags);
  const normalizedNames = new Map<string, number>();
  let assignmentCount = 0;

  for (const [index, tagName] of state.tags.entries()) {
    const normalizedName = normalizeCardTagName(tagName);
    const duplicateIndex = normalizedNames.get(normalizedName);

    if (duplicateIndex != null) {
      ctx.addIssue({
        code: "custom",
        message: "Tag names must be unique",
        path: ["tags", index],
      });
      ctx.addIssue({
        code: "custom",
        message: "Tag names must be unique",
        path: ["tags", duplicateIndex],
      });
    }

    normalizedNames.set(normalizedName, index);
  }

  for (const [cardCode, assignedTagNames] of Object.entries(state.cardTags)) {
    assignmentCount += assignedTagNames.length;

    for (const [index, tagName] of assignedTagNames.entries()) {
      if (tagNames.has(tagName)) continue;

      ctx.addIssue({
        code: "custom",
        message: "Card tag assignment references an unknown tag",
        path: ["cardTags", cardCode, index],
      });
    }
  }

  if (assignmentCount > CARD_TAG_ASSIGNMENTS_MAX_COUNT) {
    ctx.addIssue({
      code: "custom",
      message: `Card tag assignments must not exceed ${CARD_TAG_ASSIGNMENTS_MAX_COUNT}`,
      path: ["cardTags"],
    });
  }
}

export function normalizeCardTagName(name: string): string {
  return name.trim().toLowerCase();
}

export const CardTagsSyncRequestSchema = z.object({
  expectedRevision: z.uuid().nullable(),
  state: CardTagsStateSchema,
});

export type CardTagsSyncRequest = z.infer<typeof CardTagsSyncRequestSchema>;

export const CardTagsSyncResponseSchema = z.object({
  revision: z.uuid().nullable(),
  state: CardTagsStateSchema.nullable(),
});

export type CardTagsSyncResponse = z.infer<typeof CardTagsSyncResponseSchema>;
