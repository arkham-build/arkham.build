import { z } from "zod";

export const CARD_TAG_FAVORITE_ID = "favorite";
export const CARD_TAG_NAME_MAX_LENGTH = 255;

export const CardTagSchema = z.object({
  id: z.string().min(1).max(255),
  name: z.string().trim().min(1).max(CARD_TAG_NAME_MAX_LENGTH),
});

export type CardTag = z.infer<typeof CardTagSchema>;

export const CardTagsStateSchema = z
  .object({
    tags: z.record(z.string().min(1).max(255), CardTagSchema),
    cardTags: z.record(
      z.string().min(1).max(255),
      z.array(z.string().min(1).max(255)),
    ),
  })
  .superRefine(validateCardTagsState);

export type CardTagsState = z.infer<typeof CardTagsStateSchema>;

function validateCardTagsState(
  state: CardTagsState,
  ctx: z.core.$RefinementCtx<CardTagsState>,
) {
  const tagIds = new Set(Object.keys(state.tags));
  const normalizedNames = new Map<string, string>();

  for (const [tagId, tag] of Object.entries(state.tags)) {
    if (tagId !== tag.id) {
      ctx.addIssue({
        code: "custom",
        message: "Tag id must match its record key",
        path: ["tags", tagId, "id"],
      });
    }

    if (tagId === CARD_TAG_FAVORITE_ID || tag.id === CARD_TAG_FAVORITE_ID) {
      ctx.addIssue({
        code: "custom",
        message: "Favorite cannot be stored as a custom tag",
        path: ["tags", tagId, "id"],
      });
    }

    const normalizedName = tag.name.trim().toLowerCase();
    const duplicateTagId = normalizedNames.get(normalizedName);

    if (duplicateTagId != null) {
      ctx.addIssue({
        code: "custom",
        message: "Tag names must be unique",
        path: ["tags", tagId, "name"],
      });
      ctx.addIssue({
        code: "custom",
        message: "Tag names must be unique",
        path: ["tags", duplicateTagId, "name"],
      });
    }

    normalizedNames.set(normalizedName, tagId);
  }

  for (const [cardCode, assignedTagIds] of Object.entries(state.cardTags)) {
    for (const [index, tagId] of assignedTagIds.entries()) {
      if (tagId === CARD_TAG_FAVORITE_ID || tagIds.has(tagId)) continue;

      ctx.addIssue({
        code: "custom",
        message: "Card tag assignment references an unknown tag",
        path: ["cardTags", cardCode, index],
      });
    }
  }
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
