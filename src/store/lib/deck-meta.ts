import type { Deck } from "@/store/slices/data.types";
import type { AttachmentQuantities } from "@/store/slices/deck-edits.types";
import type { Metadata } from "@/store/slices/metadata.types";
import { range } from "@/utils/range";
import type {
  Annotations,
  CardWithRelations,
  Customization,
  Customizations,
  DeckMeta,
  SealedDeck,
  Selection,
  Selections,
} from "./types";

export function decodeDeckMeta(deck: Deck): DeckMeta {
  try {
    const metaJson = JSON.parse(deck.meta);
    return typeof metaJson === "object" && metaJson != null ? metaJson : {};
  } catch {
    return {};
  }
}

export function decodeSelections(
  investigator: CardWithRelations,
  deckMeta: DeckMeta,
): Selections | undefined {
  const selections = investigator.card.deck_options?.reduce<Selections>(
    (acc, option) => {
      let selection: Selection | undefined;
      let key: string | undefined;

      if (option.deck_size_select) {
        key = option.id ?? "deck_size_selected";

        selection = {
          options: Array.isArray(option.deck_size_select)
            ? option.deck_size_select
            : [option.deck_size_select],
          type: "deckSize",
          accessor: key,
          name: option.name ?? key,
          value: deckMeta.deck_size_selected
            ? Number.parseInt(deckMeta.deck_size_selected, 10)
            : 30,
        };
      } else if (option.faction_select) {
        key = option.id ?? "faction_selected";

        selection = {
          options: option.faction_select,
          type: "faction",
          accessor: key,
          name: option.name ?? key,
          value:
            (option.id
              ? deckMeta[option.id as keyof Omit<DeckMeta, "fan_made_content">]
              : deckMeta.faction_selected) ?? undefined,
        };
      } else if (option.option_select) {
        key = option.id ?? "option_selected";

        selection = {
          options: option.option_select,
          type: "option",
          accessor: key,
          name: option.name ?? key,
          value: option.option_select.find(
            (x) => x.id === deckMeta.option_selected,
          ),
        };
      }

      if (!key) return acc;
      if (selection) acc[key] = selection;
      return acc;
    },
    {},
  );

  return selections;
}

/**
 * Decodes customizations from a parsed deck.meta JSON block.
 */
export function decodeCustomizations(deckMeta: DeckMeta, metadata: Metadata) {
  let hasCustomizations = false;
  const customizations: Customizations = {};

  for (const [key, value] of Object.entries(deckMeta)) {
    // customizations are tracked in format `cus_{code}: {index}|{xp}|{choice?},...`.
    if (key.startsWith("cus_") && value) {
      hasCustomizations = true;
      const code = key.split("cus_")[1];

      customizations[code] = (value as string)
        .split(",")
        .reduce<Record<number, Customization>>((acc, curr) => {
          const entries = curr.split("|");
          const index = Number.parseInt(entries[0], 10);

          if (entries.length > 1) {
            const xp_spent = Number.parseInt(entries[1], 10);
            const selections = entries[2] ?? "";

            const option = metadata.cards[code]?.customization_options?.[index];
            if (!option) return acc;

            acc[index] = {
              selections,
              index,
              xp_spent,
            };
          }

          return acc;
        }, {});
    }
  }

  return hasCustomizations ? customizations : undefined;
}

export function encodeCustomizations(customizations: Customizations) {
  return Object.entries(customizations).reduce<Record<string, string>>(
    (acc, [code, changes]) => {
      const key = `cus_${code}`;

      const value = Object.values(changes)
        .sort((a, b) => a.index - b.index)
        .map((curr) => {
          let s = `${curr.index}`;

          if (curr.selections || curr.xp_spent != null) {
            s += `|${curr.xp_spent}`;
          }

          if (curr.selections) s += `|${curr.selections}`;
          return s;
        })
        .join(",");

      acc[key] = value;
      return acc;
    },
    {},
  );
}

export function decodeAttachments(deckMeta: DeckMeta) {
  let hasAttachments = false;
  const attachments: AttachmentQuantities = {};

  for (const [key, value] of Object.entries(deckMeta)) {
    if (key.startsWith("attachments_") && value) {
      hasAttachments = true;

      const code = key.split("attachments_")[1];

      attachments[code] = (value as string)
        .split(",")
        .reduce<Record<string, number>>((acc, curr) => {
          acc[curr] ??= 0;
          acc[curr] += 1;
          return acc;
        }, {});
    }
  }

  return hasAttachments ? attachments : undefined;
}

export function encodeAttachments(attachments: AttachmentQuantities) {
  return Object.entries(attachments).reduce<Record<string, string | null>>(
    (acc, [targetCode, attachments]) => {
      const entries = Object.entries(attachments).reduce<string[]>(
        (acc, [code, quantity]) => {
          if (quantity > 0) {
            for (const _ of range(0, quantity)) {
              acc.push(code);
            }
          }

          return acc;
        },
        [],
      );

      acc[`attachments_${targetCode}`] = entries.length
        ? entries.join(",")
        : null;
      return acc;
    },
    {},
  );
}

export function decodeCardPool(deckMeta: DeckMeta) {
  return deckMeta.card_pool?.split(",");
}

export function encodeCardPool(cardPool: string[]) {
  return cardPool.filter((x) => x).join(",");
}

export function decodeSealedDeck(deckMeta: DeckMeta) {
  const entries = deckMeta.sealed_deck?.split(",");

  if (!entries?.length) return undefined;

  const cards = entries.reduce<Record<string, number>>((acc, curr) => {
    const [code, quantity] = curr.split(":");
    acc[code] = Number.parseInt(quantity, 10);
    return acc;
  }, {});

  return {
    name: deckMeta.sealed_deck_name ?? "Sealed Deck",
    cards,
  };
}

export function encodeSealedDeck(sealed: SealedDeck) {
  return {
    sealed_deck: Object.entries(sealed.cards)
      .map(([code, quantity]) => `${code}:${quantity}`)
      .join(","),
    sealed_deck_name: sealed.name,
  };
}

export function decodeAnnotations(deckMeta: DeckMeta): Annotations {
  const annotations: Annotations = {};

  for (const [key, value] of Object.entries(deckMeta)) {
    if (key.startsWith("annotation_") && value) {
      const code = key.split("annotation_")[1];
      annotations[code] = value as string;
    }
  }

  return annotations;
}

export function encodeAnnotations(annotations: Annotations) {
  return Object.entries(annotations).reduce<Annotations>(
    (acc, [code, note]) => {
      if (note) acc[`annotation_${code}`] = note;
      return acc;
    },
    {},
  );
}
