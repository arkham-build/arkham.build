import type {
  DeckFanMadeContentSlots,
  DeckMeta,
  DeckMutablePayload,
} from "@arkham-build/shared";
import type { ArkhamDbRemoteDeck } from "./api-client/core/dtos.ts";

export function extractHiddenSlots(deck: DeckMutablePayload) {
  const meta = decodeDeckMeta(deck.meta);
  const investigatorCode = deck.investigator_code;

  const hiddenSlots: DeckFanMadeContentSlots = {
    slots: {},
    sideSlots: null,
    ignoreDeckLimitSlots: null,
    investigator_code: null,
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
    (meta.hidden_slots?.investigator_code === investigatorCode ||
      meta.fan_made_content?.cards[investigatorCode] ||
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

function isPreview(code: string) {
  return code.startsWith("13");
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

  const hasHiddenInvestigator =
    !!hiddenSlots.investigator_code &&
    hiddenSlots.investigator_code !== deck.investigator_code;

  if (hasHiddenInvestigator) {
    deck.investigator_code = hiddenSlots.investigator_code as string;
    deck.investigator_name =
      meta.fan_made_content?.cards?.[hiddenSlots.investigator_code as string]
        ?.name ??
      deck.investigator_name ??
      null;
  }

  if (hiddenSlots.investigator_code && hasHiddenInvestigator) {
    meta.hidden_slots = {
      slots: {},
      sideSlots: null,
      ignoreDeckLimitSlots: null,
      investigator_code: hiddenSlots.investigator_code,
    };
  } else {
    delete meta.hidden_slots;
  }

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
