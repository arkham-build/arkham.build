import type { JsonDataCard } from "@arkham-build/shared";
import abbreviations from "./abbreviations.json" with { type: "json" };
import additionalCards from "./additional-cards.json" with { type: "json" };
import attachments from "./attachments.json" with { type: "json" };

import cardBackTypes from "./card-back-types.json" with { type: "json" };
import gameBeginAttributes from "./game-begin-attributes.json" with {
  type: "json",
};
import hiddenFixes from "./hidden-fixes.json" with { type: "json" };
import investigatorDuplicates from "./investigator-duplicates.json" with {
  type: "json",
};
import missingTags from "./missing-tags.json" with { type: "json" };
import perInvestigatorAttributes from "./per-investigator-attributes.json" with {
  type: "json",
};
import playerCardDeckOptions from "./player-card-deck-options.json" with {
  type: "json",
};
import previews from "./previews.json" with { type: "json" };
import rbw from "./rbw.json" with { type: "json" };
import reprints from "./reprints.json" with { type: "json" };

export default [
  ...abbreviations,
  ...additionalCards,
  ...attachments,
  ...cardBackTypes,
  ...gameBeginAttributes,
  ...hiddenFixes,
  ...investigatorDuplicates,
  ...missingTags,
  ...perInvestigatorAttributes,
  ...playerCardDeckOptions,
  ...previews.map((card) => ({
    ...(card as JsonDataCard),
    preview: true,
  })),
  ...rbw,
  ...reprints,
] as (Partial<JsonDataCard> & { code: string; patch?: true })[];
