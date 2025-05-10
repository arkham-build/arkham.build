import { CARD_SET_ORDER } from "@/utils/constants";
import type { StoreState } from "../slices";
import { applyCardChanges } from "./card-edits";
import type { LookupTables } from "./lookup-tables.types";
import { makeSortFunction, sortByName } from "./sorting";
import type { CardWithRelations, Customizations, ResolvedCard } from "./types";

/**
 * Given a card code, resolve the card and its relations for display.
 */
export function resolveCardWithRelations<T extends boolean>(
  deps: Pick<StoreState, "metadata"> & { lookupTables: LookupTables },
  collator: Intl.Collator,
  code: string | undefined,
  tabooSetId: number | null | undefined,
  customizations?: Customizations,
  withRelations?: T,
): T extends true ? CardWithRelations | undefined : ResolvedCard | undefined {
  if (!code) return undefined;

  let card = deps.metadata.cards[code];
  if (!card) return undefined;

  card = applyCardChanges(card, deps.metadata, tabooSetId, customizations);

  const pack = deps.metadata.packs[card.pack_code];
  const type = deps.metadata.types[card.type_code];
  const cycle = deps.metadata.cycles[pack.cycle_code];

  const subtype = card.subtype_code
    ? deps.metadata.subtypes[card.subtype_code]
    : undefined;

  const encounterSet = card.encounter_code
    ? deps.metadata.encounterSets[card.encounter_code]
    : undefined;

  const back = card.back_link_id
    ? resolveCardWithRelations(
        deps,
        collator,
        card.back_link_id,
        tabooSetId,
        customizations,
      )
    : undefined;

  const cardWithRelations: CardWithRelations = {
    back,
    card,
    cycle,
    encounterSet,
    pack,
    subtype,
    type,
  };

  if (withRelations) {
    if (card.type_code === "investigator") {
      cardWithRelations.relations = {
        advanced: resolveRelationArray(
          deps,
          collator,
          "advanced",
          card.code,
          tabooSetId,
        ),
        base: resolveRelation(deps, collator, "base", card.code, tabooSetId),
        parallel: resolveRelation(
          deps,
          collator,
          "parallel",
          card.code,
          tabooSetId,
        ),
        replacement: resolveRelationArray(
          deps,
          collator,
          "replacement",
          card.code,
          tabooSetId,
        ),
        requiredCards: resolveRelationArray(
          deps,
          collator,
          "requiredCards",
          card.code,
          tabooSetId,
        ),
        parallelCards: resolveRelationArray(
          deps,
          collator,
          "parallelCards",
          card.code,
          tabooSetId,
        ),
        otherVersions: resolveRelationArray(
          deps,
          collator,
          "otherVersions",
          card.code,
          tabooSetId,
        ),
      };
    } else {
      cardWithRelations.relations = {
        restrictedTo: resolveRelationArray(
          deps,
          collator,
          "restrictedTo",
          card.code,
          tabooSetId,
        ),
        level: resolveRelationArray(
          deps,
          collator,
          "level",
          card.code,
          tabooSetId,
        ),
      };

      if (card.restrictions?.investigator) {
        const investigator = resolveCardWithRelations(
          deps,
          collator,
          Object.keys(card.restrictions.investigator)[0],
          tabooSetId,
          customizations,
          true,
        );

        const related = [
          ...(investigator?.relations?.advanced ?? []),
          ...(investigator?.relations?.requiredCards ?? []),
          ...(investigator?.relations?.replacement ?? []),
        ];

        const sortFn = sortByName(collator);

        const matches = related
          .filter(
            (relatedCard) =>
              relatedCard.card.code !== card.code &&
              relatedCard.card.subtype_code === card.subtype_code,
          )
          .sort((a, b) => sortFn(a.card, b.card));

        if (matches.length) {
          cardWithRelations.relations.otherSignatures = matches;
        }
      }
    }

    cardWithRelations.relations.duplicates = resolveRelationArray(
      deps,
      collator,
      "duplicates",
      card.code,
      tabooSetId,
      customizations,
      false,
    );

    cardWithRelations.relations.bound = resolveRelationArray(
      deps,
      collator,
      "bound",
      card.code,
      tabooSetId,
    );

    cardWithRelations.relations.bonded = resolveRelationArray(
      deps,
      collator,
      "bonded",
      card.code,
      tabooSetId,
    );
  }

  return cardWithRelations;
}

function resolveRelation(
  deps: Pick<StoreState, "metadata"> & { lookupTables: LookupTables },
  collator: Intl.Collator,
  key: keyof LookupTables["relations"],
  code: string,
  tabooSetId: number | null | undefined,
  customizations?: Customizations,
): ResolvedCard | undefined {
  const relations = resolveRelationArray(
    deps,
    collator,
    key,
    code,
    tabooSetId,
    customizations,
  );
  return relations.length ? relations[0] : undefined;
}

function resolveRelationArray(
  deps: Pick<StoreState, "metadata"> & { lookupTables: LookupTables },
  collator: Intl.Collator,
  key: keyof LookupTables["relations"],
  code: string,
  tabooSetId: number | null | undefined,
  customizations?: Customizations,
  ignoreDuplicates = true,
): ResolvedCard[] {
  const { metadata, lookupTables } = deps;

  const relation = lookupTables.relations[key];

  const relations = relation[code]
    ? Object.keys(relation[code]).reduce<CardWithRelations[]>((acc, code) => {
        const card = resolveCardWithRelations(
          deps,
          collator,
          code,
          tabooSetId,
          customizations,
          false,
        );

        if (card && (!ignoreDuplicates || !card.card.duplicate_of_code)) {
          acc.push(card);
        }

        return acc;
      }, [])
    : [];

  const sortFn = makeSortFunction(
    ["type", "name", "level", "cycle"],
    metadata,
    collator,
  );

  relations.sort(({ card: a }, { card: b }) => sortFn(a, b));
  return relations;
}

function sortRelations(a: string, b: string) {
  return CARD_SET_ORDER.indexOf(a) - CARD_SET_ORDER.indexOf(b);
}

export function getRelatedCards(
  cardWithRelations: CardWithRelations,
): [string, ResolvedCard | ResolvedCard[]][] {
  return Object.entries(cardWithRelations.relations ?? {})
    .filter(
      ([key, value]) =>
        key !== "duplicates" &&
        (Array.isArray(value) ? value.length > 0 : value),
    )
    .sort((a, b) => sortRelations(a[0], b[0]));
}

export function getRelatedCardQuantity(
  key: string,
  set: ResolvedCard | ResolvedCard[],
) {
  const cards = Array.isArray(set) ? set : [set];
  const canShowQuantity =
    key !== "parallel" && key !== "level" && key !== "restrictedTo";

  return canShowQuantity
    ? cards.reduce<Record<string, number>>((acc, { card }) => {
        acc[card.code] = card.quantity;
        return acc;
      }, {})
    : undefined;
}
