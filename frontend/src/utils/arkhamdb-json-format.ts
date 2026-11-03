import {
  type ApiCard,
  decodeDeckRequirements,
  decodeRestrictions,
  type JsonDataCard,
  type JsonDataCycle,
  type JsonDataPack,
} from "@arkham-build/shared";

export function packToApiFormat(pack: JsonDataPack & { official?: boolean }) {
  return {
    ...pack,
    real_name: pack.name,
  };
}

export function cycleToApiFormat(
  cycle: JsonDataCycle & { official?: boolean },
) {
  return {
    ...cycle,
    real_name: cycle.name,
  };
}

export function cardToApiFormat(
  card: JsonDataCard & { official?: boolean; chapter?: number },
  mode = "card",
): ApiCard {
  const fullCard: ApiCard = {
    ...card,
    alternate_of_code: card.alternate_of,
    back_link_id: card.back_link,
    real_customization_change: card.customization_change,
    real_customization_text: card.customization_text,
    duplicate_of_code: card.duplicate_of,
    id: card.code,
    exceptional: card.text?.includes("Exceptional."),
    myriad: card.text?.includes("Myriad."),
    real_flavor: card.flavor,
    real_name: card.name,
    real_text: card.text,
    real_traits: card.traits,
    real_subname: card.subname,
    real_slot: card.slot,
    real_back_flavor: card.back_flavor,
    real_back_text: card.back_text,
    real_back_name: card.back_name,
    real_back_traits: card.back_traits,
    deck_requirements: decodeDeckRequirements(card.deck_requirements),
    restrictions: decodeRestrictions(card.restrictions),
    side_deck_requirements: decodeDeckRequirements(card.side_deck_requirements),
    tags: card.tags?.split("."),
  };

  return mode === "patch"
    ? (Object.fromEntries(
        Object.entries(fullCard).filter(([_, value]) => value !== undefined),
      ) as ApiCard)
    : fullCard;
}
