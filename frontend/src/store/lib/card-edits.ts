import type { ApiCard, Card } from "@arkham-build/shared";
import type { Metadata } from "@/store/slices/metadata.types";
import { displayAttribute, splitMultiValue } from "@/utils/card-utils";
import i18n from "@/utils/i18n";
import type { Customizations } from "./types";

type Insert = {
  edit: string;
  position: number;
  index: number;
};

/**
 * Applies customizations to a card, taking into account:
 * 1. Changes to the card text and attributes.
 * 2. Changes to the customizable_text itself.
 */
function applyCustomizations(
  card: Card,
  metadata: Metadata,
  customizations: Customizations | undefined,
): Card {
  if (
    !customizations ||
    !customizations[card.code] ||
    !card.real_customization_change ||
    !card.real_customization_text ||
    !card.customization_options
  ) {
    return card;
  }

  const cardCustomizations = customizations[card.code];
  const customizationChanges = card.real_customization_change.split("\n");
  let displayCustomizationChanges = displayAttribute(
    card,
    "customization_change",
  ).split("\n");

  if (displayCustomizationChanges.length !== customizationChanges.length) {
    console.warn("Mismatched customization changes for card", card.code);
    displayCustomizationChanges = customizationChanges;
  }

  const nextCard: Card & {
    customization_xp: number;
  } = { ...card, customization_xp: 0 };

  const lines = card.real_text?.split("\n") ?? [];
  let displayLines = displayAttribute(card, "text").split("\n");

  if (lines.length !== displayLines.length) {
    console.warn("Mismatched card text for card", card.code);
    displayLines = lines;
  }

  const toInsert: Insert[] = [];
  const displayToInsert: Insert[] = [];

  card.customization_options.forEach((option, i) => {
    const customization = cardCustomizations[i];
    if (!customization) return;

    const xpSpent = customization.xp_spent ?? 0;
    nextCard.customization_xp += xpSpent;

    if (xpSpent >= option.xp) {
      if (option.health) nextCard.health = (card.health ?? 0) + option.health;
      if (option.sanity) nextCard.sanity = (card.sanity ?? 0) + option.sanity;
      if (option.deck_limit) nextCard.deck_limit = option.deck_limit;
      if (option.real_slot) nextCard.real_slot = option.real_slot;
      if (option.real_traits) {
        nextCard.real_traits = option.real_traits;
        nextCard.traits = `${splitMultiValue(option.real_traits)
          .map((_trait) => {
            const trait = _trait.trim();
            const key = `common.traits.${trait}`;
            return i18n.exists(key) ? i18n.t(key) : trait;
          })
          .join(". ")}.`;
      }
      if (option.cost) nextCard.cost = (nextCard.cost ?? 0) + option.cost;
      if (option.tags) {
        nextCard.tags = [...(nextCard.tags ?? []), ...option.tags];
      }

      let edit = customizationChanges[i];
      let displayEdit = displayCustomizationChanges[i];

      const selections = customization.selections;

      switch (option.choice) {
        case "choose_trait": {
          const traits = selections
            ?.split("^")
            ?.reduce<string>((acc, trait) => {
              if (!trait) return acc;
              const key = `common.traits.${trait}`;
              const formatted = `[[${i18n.exists(key) ? i18n.t(key) : trait}]]`;
              return acc ? `${acc}, ${formatted}` : formatted;
            }, "");

          edit = traits ? edit.replace("_____", traits) : edit;
          displayEdit = traits
            ? displayEdit.replace("_____", traits)
            : displayEdit;

          break;
        }

        case "choose_skill": {
          const skill = selections ?? "";

          edit = skill ? edit.replace("_____", `[${skill}]`) : edit;
          displayEdit = skill
            ? displayEdit.replace("_____", `[${skill}]`)
            : displayEdit;

          break;
        }

        case "choose_card": {
          const cards = selections?.split("^").reduce((acc, code) => {
            if (!code) return acc;
            const card = `<u>${displayAttribute(metadata.cards[code], "name")}</u>`;
            return acc ? `${acc}, ${card}` : card;
          }, "");

          edit = `${edit} ${cards}`;
          displayEdit = `${displayEdit} ${cards}`;

          break;
        }

        case "remove_slot": {
          // slot choice stores the index of a slot to remove.
          const choice = Number.parseInt(selections ?? "", 10);

          if (!Number.isNaN(choice) && card.real_slot) {
            nextCard.original ??= {};
            nextCard.original.real_slot = card.real_slot;

            nextCard.real_slot = card.real_slot
              ?.split(".")
              .reduce<string>((acc, curr, i) => {
                if (i === choice) return acc;
                const slot = curr.trim();
                return acc ? `${acc}. ${slot}` : slot;
              }, "");
          }
        }
      }

      if (option.text_change === "append") {
        lines.push(edit);
        displayLines.push(displayEdit);
      }

      if (option.text_change === "replace") {
        lines.splice(option.position ?? 0, 1, edit);
        displayLines.splice(option.position ?? 0, 1, displayEdit);
      }

      if (option.text_change === "insert") {
        toInsert.push({ edit, position: option.position ?? 0, index: i });
        displayToInsert.push({
          edit: displayEdit,
          position: option.position ?? 0,
          index: i,
        });
      }
    }
  });

  toInsert.sort((a, b) => b.position - a.position || b.index - a.index);
  displayToInsert.sort((a, b) => b.position - a.position || b.index - a.index);

  for (const { edit, position } of toInsert) {
    lines.splice(position + 1, 0, edit);
  }

  for (const { edit, position } of displayToInsert) {
    displayLines.splice(position + 1, 0, edit);
  }

  nextCard.real_text = lines.join("\n");
  nextCard.text = displayLines.join("\n");

  return nextCard;
}

export function applyTaboo(
  card: Card,
  metadata: Metadata,
  tabooSetId: number | null | undefined,
): Card {
  if (!tabooSetId) return card;

  const taboo = metadata.taboos[`${card.code}-${tabooSetId}`];
  if (!taboo) return card;

  const nextCard: Card = { ...card };

  // taboos duplicate the card structure, so a simple merge is safe to apply them.
  for (const [key, value] of Object.entries(taboo)) {
    if (value !== undefined) {
      nextCard[key as keyof Card] = value as never;
      const originalValue = card[key as keyof ApiCard];
      if (originalValue) {
        nextCard.original ??= {};
        nextCard.original[key as keyof ApiCard] = originalValue as never;
      }
    }
  }

  return nextCard;
}

export function applyCardChanges(
  card: Card,
  metadata: Metadata,
  tabooSetId: number | null | undefined,
  customizations: Customizations | undefined,
) {
  return applyCustomizations(
    applyTaboo(card, metadata, tabooSetId),
    metadata,
    customizations,
  );
}
