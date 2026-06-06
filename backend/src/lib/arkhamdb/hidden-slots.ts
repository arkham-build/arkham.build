import type {
  DeckFanMadeContentSlots,
  DeckMeta,
  DeckWritePayload,
} from "@arkham-build/shared";
import type { ArkhamDbRemoteDeck } from "./api-client/core/dtos.ts";

export function extractHiddenSlots(deck: DeckWritePayload) {
  const meta = decodeDeckMeta(deck.meta);
  const investigatorCode = deck.investigator_code;

  const hiddenSlots: DeckFanMadeContentSlots = {
    slots: {},
    sideSlots: null,
    ignoreDeckLimitSlots: null,
    investigator_code: investigatorCode ?? "89001",
  };

  let changed = false;

  for (const key of ["slots", "sideSlots", "ignoreDeckLimitSlots"] as const) {
    const slots = Object.entries(deck[key] ?? {});
    if (!slots.length) continue;

    for (const [code, quantity] of slots) {
      const isFanMade = meta.fan_made_content?.cards?.[code];

      if (isFanMade || isPreview(code)) {
        hiddenSlots[key] ??= {};
        hiddenSlots[key][code] = quantity;
        delete deck[key]?.[code];
        changed = true;
      }
    }
  }

  if (
    investigatorCode &&
    (meta.fan_made_content?.cards[investigatorCode] ||
      isPreview(investigatorCode))
  ) {
    hiddenSlots.investigator_code = investigatorCode;
    deck.investigator_code = "89001";
    deck.investigator_name = "Subject 5U-21";
    changed = true;
  }

  if (!changed) return;

  meta.hidden_slots = hiddenSlots;
  deck.meta = JSON.stringify(meta);
}

function isPreview(_: string) {
  return false;
}

export function applyHiddenSlots(deck: ArkhamDbRemoteDeck) {
  const meta = decodeDeckMeta(deck.meta);
  if (!meta.hidden_slots) return;

  const hiddenSlots = meta.hidden_slots;

  for (const key of ["slots", "sideSlots", "ignoreDeckLimitSlots"] as const) {
    const slots = Object.entries(hiddenSlots[key] ?? {});
    if (!slots.length) continue;

    for (const [code, quantity] of slots) {
      if (!deck[key] || Array.isArray(deck[key])) {
        deck[key] = {};
      }
      deck[key][code] = quantity;
    }
  }

  if (hiddenSlots.investigator_code !== deck.investigator_code) {
    deck.investigator_code = hiddenSlots.investigator_code;
    deck.investigator_name =
      meta.fan_made_content?.cards?.[hiddenSlots.investigator_code]?.name ??
      deck.investigator_name ??
      null;
  }

  delete meta.hidden_slots;

  deck.meta = JSON.stringify(meta);
}

function decodeDeckMeta(meta: string | null | undefined): DeckMeta {
  try {
    const metaJson = JSON.parse(meta ?? "");
    return typeof metaJson === "object" && metaJson != null ? metaJson : {};
  } catch {
    return {};
  }
}
