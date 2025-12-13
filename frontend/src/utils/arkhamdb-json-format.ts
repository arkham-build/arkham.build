import type {
  ApiCard,
  ApiDeckRequirements,
  ApiRestrictions,
  JsonDataCard,
} from "@/store/schemas/card.schema";
import type { JsonDataCycle } from "@/store/schemas/cycle.schema";
import type { JsonDataPack } from "@/store/schemas/pack.schema";

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
  card: JsonDataCard & { official?: boolean },
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

type Restrictions = ApiRestrictions;

function decodeRestrictions(
  str: string | null | undefined,
): Restrictions | undefined {
  return str?.split(", ").reduce((acc: Restrictions, curr: string) => {
    const key = curr.substring(0, curr.indexOf(":"));
    const val = curr.substring(curr.indexOf(":") + 1);

    if (key === "investigator") {
      acc.investigator ??= {};
      const values = val.split(":");
      for (const val of values) {
        acc.investigator[val] = val;
      }
    }

    if (key === "trait") {
      acc.trait ??= [];
      acc.trait.push(val);
    }

    if (key === "faction") {
      acc.faction ??= [];
      acc.faction.push(val);
    }

    return acc;
  }, {} as Restrictions);
}

function decodeDeckRequirements(
  str?: string | null,
): ApiDeckRequirements | undefined {
  return str?.split(", ").reduce((acc: ApiDeckRequirements, curr: string) => {
    const key = curr.substring(0, curr.indexOf(":"));
    const val = curr.substring(curr.indexOf(":") + 1);

    if (key === "size") {
      acc.size = Number.parseInt(val, 10);
    }

    if (key === "random") {
      const [target, value] = val.split(":");
      acc.random ??= [];
      acc.random.push({ target, value });
    }

    if (key === "card") {
      acc.card ??= {};

      const values = val.split(":");

      acc.card[values[0]] = values.reduce<Record<string, string>>(
        (acc, curr) => {
          acc[curr] = curr;
          return acc;
        },
        {},
      );
    }

    return acc;
  }, {} as ApiDeckRequirements);
}
