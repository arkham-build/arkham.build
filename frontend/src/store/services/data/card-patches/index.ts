import type { JsonDataCard } from "@/store/schemas/card.schema";
import attachments from "./attachments.json";
import gameBeginAttributes from "./game-begin-attributes.json";
import investigatorDuplicates from "./investigator-duplicates.json";
import missingTags from "./missing-tags.json";
import perInvestigatorAttributes from "./per-investigator-attributes.json";
import playerCardDeckOptions from "./player-card-deck-options.json";
import previews from "./previews.json";
import rbw from "./rbw.json";

export default [
  ...attachments,
  ...gameBeginAttributes,
  ...investigatorDuplicates,
  ...missingTags,
  ...playerCardDeckOptions,
  ...previews.map((card) => ({ ...card, preview: true })),
  ...rbw,
  ...perInvestigatorAttributes,
] as (Partial<JsonDataCard> & { code: string; patch?: true })[];
