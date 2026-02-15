import {
  type FanMadeCard,
  type FanMadeProject,
  FanMadeProjectSchema,
} from "@arkham-build/shared";
import { z } from "zod";
import type { Deck } from "@/store/schemas/deck.schema";
import {
  cardToApiFormat,
  cycleToApiFormat,
  packToApiFormat,
} from "@/utils/arkhamdb-json-format";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import type { EncounterSet } from "../schemas/encounter-set.schema";
import type { StoreState } from "../slices";
import type { Metadata } from "../slices/metadata.types";
import { decodeDeckMeta } from "./deck-meta";
import type { DeckFanMadeContent, DeckFanMadeContentSlots } from "./types";

export function parseFanMadeProject(data: unknown): FanMadeProject {
  return z.parse(FanMadeProjectSchema, data);
}

export function validateFanMadeProject(project: FanMadeProject): void {
  const errors = [];

  const encounterCodes = new Set(
    project.data.encounter_sets.map((set) => set.code),
  );

  const packCodes = new Set(project.data.packs.map((pack) => pack.code));

  const cards: Record<string, FanMadeCard> = {};
  const backLinks = new Set<string>();
  const signatureCodes: string[] = [];

  for (const card of project.data.cards) {
    // Check that the card references a pack from the project.
    if (!packCodes.has(card.pack_code)) {
      errors.push(
        `Card ${card.code} references unknown pack: ${card.pack_code}`,
      );
    }

    // Check that the card references an encounter set from the project.
    if (card.encounter_code) {
      if (!encounterCodes.has(card.encounter_code)) {
        errors.push(
          `Card ${card.code} references unknown encounter set: ${card.encounter_code}`,
        );
      }
    }

    card.deck_requirements
      ?.split(", ")
      .filter((str) => str.startsWith("card"))
      .forEach((str) => {
        const codes = str.split(":").slice(1);
        signatureCodes.push(...codes);
      });

    cards[card.code] = card;
    if (card.back_link) backLinks.add(card.back_link);
  }

  // Check that signature's level is set to `null`.
  for (const code of signatureCodes) {
    const signature = cards[code];
    if (signature?.subtype_code == null && signature?.xp != null) {
      errors.push(
        `${signature.name} is a signature, but has a non-null level. Make sure that its "Level" is set to "None" and export the project again.`,
      );
    }
  }

  // Check that backs exists and are hidden.
  for (const backLink of backLinks) {
    if (!cards[backLink]) {
      errors.push(
        `Card ${backLink} is referenced as a back_link but does not exist`,
      );
    }

    if (!cards[backLink].hidden) {
      errors.push(
        `Card ${backLink} is referenced as a back_link but is not hidden`,
      );
    }
  }

  if (errors.length) {
    const message = `${project.meta.name} failed validation.\n${errors.join("\n")}`;
    throw new Error(message);
  }
}

export function cloneMetadata(metadata: StoreState["metadata"]) {
  return {
    ...metadata,
    cards: { ...metadata.cards },
    encounterSets: { ...metadata.encounterSets },
    packs: { ...metadata.packs },
    cycles: { ...metadata.cycles },
  };
}

export function addProjectToMetadata(meta: Metadata, project: FanMadeProject) {
  const encounterSets = project.data.encounter_sets.reduce(
    (acc, curr) => {
      acc[curr.code] = curr as unknown as EncounterSet;
      return acc;
    },
    {} as Record<string, EncounterSet>,
  );

  if (!meta.cycles[project.meta.code]) {
    meta.cycles[project.meta.code] = cycleToApiFormat({
      code: project.meta.code,
      name: project.meta.name,
      position: 999,
      official: false,
    });
  }

  for (const pack of project.data.packs) {
    if (!meta.packs[pack.code]) {
      meta.packs[pack.code] = packToApiFormat({
        ...pack,
        cycle_code: project.meta.code,
        official: false,
        position: pack.position ?? 1,
      });
    }
  }

  for (const card of project.data.cards) {
    if (card.encounter_code && encounterSets[card.encounter_code]) {
      encounterSets[card.encounter_code].pack_code = card.pack_code;
    }

    if (!meta.cards[card.code]) {
      meta.cards[card.code] = cardToApiFormat({ ...card, official: false });
    }
  }

  for (const encounterSet of Object.values(encounterSets)) {
    if (encounterSet.pack_code && !meta.encounterSets[encounterSet.code]) {
      meta.encounterSets[encounterSet.code] = encounterSet;
    }
  }
}

export function buildCacheFromDecks(decks: Deck[]) {
  return decks.reduce(
    (acc, deck) => {
      const meta = decodeDeckMeta(deck);

      const content = meta.fan_made_content;

      if (!content) return acc;

      if (content.cards) {
        for (const key of Object.keys(content.cards)) {
          acc.cards[key] = content.cards[key];
        }
      }

      if (content.cycles) {
        for (const key of Object.keys(content.cycles)) {
          acc.cycles[key] = content.cycles[key];
        }
      }

      if (content.packs) {
        for (const key of Object.keys(content.packs || {})) {
          acc.packs[key] = content.packs[key];
        }
      }

      if (content.encounter_sets) {
        for (const key of Object.keys(content.encounter_sets)) {
          acc.encounter_sets[key] = content.encounter_sets[key];
        }
      }

      return acc;
    },
    {
      cards: {},
      cycles: {},
      packs: {},
      encounter_sets: {},
    } as DeckFanMadeContent,
  );
}

export function extractHiddenSlots(deck: Deck, metadata: Metadata) {
  const meta = decodeDeckMeta(deck);

  const hiddenSlots: DeckFanMadeContentSlots = {
    slots: {},
    sideSlots: null,
    ignoreDeckLimitSlots: null,
    investigator_code: deck.investigator_code,
  };

  for (const key of ["slots", "sideSlots", "ignoreDeckLimitSlots"] as const) {
    const slots = Object.entries(deck[key] ?? {});
    if (!slots.length) continue;

    for (const [code, quantity] of slots) {
      if (
        meta.fan_made_content?.cards?.[code] ||
        metadata.cards[code]?.preview
      ) {
        hiddenSlots[key] ??= {};
        hiddenSlots[key][code] = quantity;
        delete deck[key]?.[code];
      }
    }
  }

  if (
    meta.fan_made_content?.cards[deck.investigator_code] ||
    metadata.cards[deck.investigator_code]?.preview
  ) {
    hiddenSlots.investigator_code = deck.investigator_code;
    deck.investigator_code = SPECIAL_CARD_CODES.SUZI;
    deck.investigator_name = "Subject 5U-21";
  }

  meta.hidden_slots = hiddenSlots;

  deck.meta = JSON.stringify(meta);
}

export function applyHiddenSlots(deck: Deck, metadata: Metadata) {
  const meta = decodeDeckMeta(deck);
  if (!meta.hidden_slots) return;

  const hiddenSlots = meta.hidden_slots;

  for (const key of ["slots", "sideSlots", "ignoreDeckLimitSlots"] as const) {
    const slots = Object.entries(hiddenSlots[key] ?? {});
    if (!slots.length) continue;

    for (const [code, quantity] of slots) {
      deck[key] ??= {};
      deck[key][code] = quantity;
    }
  }

  if (hiddenSlots.investigator_code !== deck.investigator_code) {
    deck.investigator_code = hiddenSlots.investigator_code;
    deck.investigator_name =
      meta.fan_made_content?.cards?.[hiddenSlots.investigator_code]?.name ||
      metadata.cards[hiddenSlots.investigator_code]?.real_name ||
      deck.investigator_name;
  }

  delete meta.hidden_slots;

  deck.meta = JSON.stringify(meta);
}
