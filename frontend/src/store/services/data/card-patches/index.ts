import type { JsonDataCard } from "@arkham-build/shared";
import attachments from "./attachments.json";
import cardBackTypes from "./card-back-types.json";
import gameBeginAttributes from "./game-begin-attributes.json";
import hiddenFixes from "./hidden-fixes.json";
import investigatorDuplicates from "./investigator-duplicates.json";
import missingTags from "./missing-tags.json";
import perInvestigatorAttributes from "./per-investigator-attributes.json";
import playerCardDeckOptions from "./player-card-deck-options.json";
import previews from "./previews.json";
import rbw from "./rbw.json";

export default [
  ...attachments,
  ...cardBackTypes,
  ...gameBeginAttributes,
  ...hiddenFixes,
  ...investigatorDuplicates,
  ...missingTags,
  ...playerCardDeckOptions,
  ...previews.map((card) => ({ ...card, preview: true })),
  ...rbw,
  ...perInvestigatorAttributes,
] as (Partial<JsonDataCard> & { code: string; patch?: true })[];
