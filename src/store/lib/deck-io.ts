import {
  type DeckValidationResult,
  validateDeck,
} from "@/store/lib/deck-validation";
import type {
  Card,
  CustomizationOption,
  OptionSelect,
} from "@/store/services/queries.types";
import type { StoreState } from "@/store/slices";
import type { Deck, DeckProblem, Id } from "@/store/slices/data.types";
import { displayAttribute, splitMultiValue } from "@/utils/card-utils";
import { randomId } from "@/utils/crypto";
import { formatTabooSet } from "@/utils/formatting";
import i18n from "@/utils/i18n";
import { isEmpty } from "@/utils/is-empty";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "../selectors/shared";
import { getInitialSettings } from "../slices/settings";
import {
  type DeckGrouping,
  groupDeckCards,
  isGroupCollapsed,
  resolveParents,
  resolveQuantities,
} from "./deck-grouping";
import { getGroupingKeyLabel } from "./grouping";
import { resolveDeck } from "./resolve-deck";
import { makeSortFunction } from "./sorting";
import type { Customizations, ResolvedDeck } from "./types";

export function formatDeckImport(
  state: StoreState,
  deck: Deck,
  type: string,
): Deck {
  const now = new Date().toISOString();

  const validation = validateDeck(
    resolveDeck(
      {
        lookupTables: selectLookupTables(state),
        metadata: selectMetadata(state),
        sharing: state.sharing,
      },
      selectLocaleSortingCollator(state),
      deck,
    ),
    selectMetadata(state),
    selectLookupTables(state),
  );

  const problem = mapValidationToProblem(validation);

  const cleanedDeck = Object.entries(deck).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (isApiDeckKey(key)) {
        acc[key] = value;
      }

      return acc;
    },
    {},
  );

  return {
    ...(cleanedDeck as Deck),
    id: randomId(),
    problem,
    date_creation: now,
    date_update: now,
    tags:
      type === "decklist"
        ? (deck.tags?.replaceAll(", ", " ") ?? null)
        : deck.tags,
    previous_deck: null,
    next_deck: null,
    xp: null,
    xp_adjustment: null,
    xp_spent: null,
  };
}

export function formatDeckShare(
  _deck: Deck,
  previousDeck: Id | null = null,
): Deck {
  const deck = structuredClone(_deck);
  deck.previous_deck = previousDeck;
  deck.source = undefined;
  deck.next_deck = null;
  return deck;
}

export function mapValidationToProblem(
  validation: DeckValidationResult,
): DeckProblem | null {
  if (validation.valid) return null;

  const error = validation.errors[0];
  if (!error) return null;

  switch (error.type) {
    case "TOO_FEW_CARDS":
      return "too_few_cards";
    case "TOO_MANY_CARDS":
      return "too_many_cards";
    case "INVALID_CARD_COUNT":
      return "too_many_copies";
    case "INVALID_DECK_OPTION":
      return "deck_options_limit";
    case "FORBIDDEN":
      return "invalid_cards";
    default:
      return "investigator";
  }
}

// This is very ugly, but not a hot path, so who cares.
export function formatDeckAsText(state: StoreState, deck: ResolvedDeck) {
  let text = "";

  const t = i18n.t;

  const investigatorName = displayAttribute(
    deck.cards.investigator.card,
    "name",
  );

  text += `# ${deck.name}\n\n`;
  text += `${t("common.type.investigator")}: ${investigatorName}  \n`;

  if (deck.hasParallel) {
    const front =
      deck.cards.investigator.card.code === deck.investigatorFront.card.code
        ? t("deck_edit.config.sides.original_front")
        : t("deck_edit.config.sides.parallel_front");

    const back =
      deck.cards.investigator.card.code === deck.investigatorBack.card.code
        ? t("deck_edit.config.sides.original_back")
        : t("deck_edit.config.sides.parallel_back");

    text += `${t("common.parallel")}: ${front}, ${back}  \n`;
  }

  if (deck.selections) {
    for (const selection of Object.values(deck.selections)) {
      const value = selection.value;

      let str = t("common.none");
      if (value) {
        if (selection.type === "faction") {
          str = t(`common.factions.${value}`);
        } else if (selection.type === "option") {
          str = t(`common.deck_options.${(value as OptionSelect).name}`);
        } else {
          str = value as string;
        }
      }

      text += `${t(`common.deck_options.${selection.name}`)}: ${str}  \n`;
    }
  }

  text += `\n${t("common.xp")}: ${deck.stats.xpRequired}  \n`;

  if (deck.tabooSet) {
    text += `${t("common.taboo")}†: ${formatTabooSet(deck.tabooSet)}  \n`;
  }

  const groups = groupDeckCards(
    selectMetadata(state),
    selectLocaleSortingCollator(state),
    getInitialSettings().lists.deck,
    deck,
  );

  if (groups.slots && !isEmpty(deck.slots)) {
    text += `\n## ${t("common.decks.slots")}\n\n${formatGrouping(state, groups.slots, deck.slots, deck.customizations)}`;
  }

  if (groups.sideSlots && !isEmpty(deck.sideSlots)) {
    text += `\n## ${t("common.decks.sideSlots")}\n\n${formatGrouping(state, groups.sideSlots, deck.sideSlots, {})}`;
  }

  if (groups.extraSlots && deck.extraSlots) {
    text += `## ${t("common.decks.extraSlots")}\n\n${formatGrouping(state, groups.extraSlots, deck.extraSlots, {})}`;
  }

  return text;
}

function formatGrouping(
  state: StoreState,
  grouping: DeckGrouping,
  slots: { [code: string]: number },
  customizations?: Customizations,
) {
  let text = "";

  const metadata = selectMetadata(state);
  const quantities = resolveQuantities(grouping);

  const seenParents = new Set<string>();

  grouping.data.forEach((group, i) => {
    const parents = resolveParents(grouping, group).filter(
      (parent) => !seenParents.has(parent.key),
    );

    parents.forEach((parent, _) => {
      seenParents.add(parent.key);
      const key = parent.key.split("|").at(-1) as string;
      const type = parent.type.split("|").at(-1) as string;
      text += `**${getGroupingKeyLabel(type, key, metadata)}** (${quantities.get(parent.key) ?? 0})  \n`;
    });

    if (!isGroupCollapsed(group)) {
      const key = group.key.split("|").at(-1) as string;
      const type = group.type.split("|").at(-1) as string;
      text += `_${getGroupingKeyLabel(type, key, metadata)}_ (${quantities.get(group.key) ?? 0})  \n`;
    }

    text += formatGroupAsText(state, group.cards, slots, customizations);
    if (i < grouping.data.length - 1) text += "\n";
  });

  return text;
}

function formatGroupAsText(
  state: StoreState,
  data: Card[],
  quantities: { [code: string]: number },
  customizations: Customizations | undefined,
) {
  if (!data.length) return "";

  const metadata = selectMetadata(state);

  const sortFn = makeSortFunction(
    ["name"],
    metadata,
    selectLocaleSortingCollator(state),
  );

  const cards = [...data]
    .sort(sortFn)
    .map((c) => formatCardAsText(state, c, quantities, customizations))
    .join("\n");

  return `${cards}\n`;
}

function formatCardAsText(
  state: StoreState,
  card: Card,
  quantities: { [code: string]: number },
  customizations: Customizations | undefined,
) {
  const name = displayAttribute(card, "name");

  const customizable = !!card.customization_options;
  const quantity = quantities[card.code] ?? 0;

  const cardStr = `- ${name}${card.taboo_set_id ? "†" : ""}${card.xp ? ` (${card.xp})` : ""}${customizable ? " (C)" : ""}${quantity > 1 ? ` x${quantity}` : ""}`;

  const customizationText = displayAttribute(card, "customization_text");

  if (customizable && customizations && customizationText) {
    const optionNames = customizationText
      .replaceAll("□", "")
      .replaceAll("<b>", "")
      .replaceAll("</b>", "")
      .replaceAll("[[", "")
      .replaceAll("]]", "")
      .replaceAll("_____", "")
      .split("\n")
      .map((n) => {
        const val = n.split(".")[0].trim();
        return val.endsWith(":") ? `${val}` : `${val}.`;
      });

    const options = card.customization_options as CustomizationOption[];

    const customizationStr = options
      .reduce<string[]>((acc, option, i) => {
        const name = optionNames[i].trim();
        const choice = customizations[card.code]?.[i];

        if (choice && choice.xp_spent >= option.xp) {
          const selection = formatCustomizableSelection(
            state,
            card,
            option,
            choice.selections ?? "",
          );

          const text = `  - ${name}`;

          if (option.choice) {
            if (text.endsWith(".")) {
              acc.push(`${text} => ${selection ?? ""}`);
            } else {
              acc.push(`${text} ${selection ?? ""}`);
            }
          } else {
            acc.push(text);
          }
        }

        return acc;
      }, [])
      .join("\n");

    if (customizationStr) {
      return `${cardStr}\n${customizationStr}`;
    }
  }

  return cardStr;
}

function formatCustomizableSelection(
  state: StoreState,
  card: Card,
  option: CustomizationOption,
  selection: string | undefined,
) {
  if (selection == null) return undefined;

  const selections = selection.split("^");

  const metadata = selectMetadata(state);

  if (option.choice === "choose_card") {
    return selections
      .map((code) => displayAttribute(metadata.cards[code], "name"))
      .join(", ");
  }

  if (option.choice === "remove_slot") {
    return selections
      .map((s) => {
        const slot = splitMultiValue(card.original_slot);
        const slotStr = slot[Number.parseInt(s, 10)];
        return i18n.t(`common.slot.${slotStr.toLowerCase()}`);
      })
      .join(", ");
  }

  if (option.choice === "choose_skill") {
    return selections.map((s) => i18n.t(`common.skill.${s}`)).join(", ");
  }

  return selections
    .map((t) => {
      const key = `common.traits.${t}`;
      return i18n.exists(key) ? i18n.t(key) : t;
    })
    .join(", ");
}

function isApiDeckKey(key: string): key is keyof Deck {
  return [
    "date_creation",
    "date_update",
    "description_md",
    "exile_string",
    "ignoreDeckLimitSlots",
    "id",
    "investigator_code",
    "meta",
    "name",
    "next_deck",
    "previous_deck",
    "problem",
    "sideSlots",
    "slots",
    "taboo_id",
    "tags",
    "version",
    "xp_adjustment",
    "xp_spent",
    "xp",
  ].includes(key);
}
