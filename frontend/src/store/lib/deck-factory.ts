import type { Deck } from "@/store/schemas/deck.schema";
import { randomId } from "@/utils/crypto";
import i18n from "@/utils/i18n";

type Payload = {
  investigator_code: string;
  investigator_name: string;
  name: string;
  slots: Record<string, number>;
} & Partial<Omit<Deck, "id" | "date_creation" | "date_update">>;

export function createDeck(values: Payload): Deck {
  const timestamp = new Date().toISOString();

  return {
    id: randomId(),
    date_creation: timestamp,
    date_update: timestamp,
    description_md: "",
    meta: "",
    ignoreDeckLimitSlots: {},
    sideSlots: {},
    next_deck: null,
    previous_deck: null,
    tags: "",
    version: "0.1",
    taboo_id: null,
    xp: null,
    xp_spent: null,
    exile_string: null,
    xp_adjustment: null,
    ...values,
  };
}

export function getDefaultDeckName(name: string, faction: string) {
  return i18n.t(`deck_create.default_name.${faction}`, { name });
}

export function cloneDeck(deck: Deck): Deck {
  const now = new Date().toISOString();

  return {
    ...structuredClone(deck),
    id: randomId(),
    name: `(Copy) ${deck.name}`,
    date_creation: now,
    date_update: now,
    exile_string: null,
    next_deck: null,
    previous_deck: null,
    version: "0.1",
    source: undefined,
    xp: null,
    xp_adjustment: null,
    xp_spent: null,
  };
}
