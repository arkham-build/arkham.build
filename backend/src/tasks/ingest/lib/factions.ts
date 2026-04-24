import type { JsonDataFaction } from "@arkham-build/shared";
import type { WithItemTranslations } from "./json-data.types.ts";

type IgnoredAttributes = {
  octgn_id?: string;
};

export function resolveFactions(
  factions: WithItemTranslations<JsonDataFaction & IgnoredAttributes>[],
) {
  return factions.map(({ octgn_id: _, ...faction }) => faction);
}
