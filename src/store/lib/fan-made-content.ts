import {
  cardToApiFormat,
  cycleToApiFormat,
  packToApiFormat,
} from "@/utils/arkhamdb-json-format";
import * as z from "@zod/mini";
import type { EncounterSet } from "../services/queries.types";
import type { StoreState } from "../slices";
import type { Metadata } from "../slices/metadata.types";
import {
  type FanMadeCard,
  type FanMadeProject,
  FanMadeProjectSchema,
} from "./fan-made-content.schemas";

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

    cards[card.code] = card;
    if (card.back_link) backLinks.add(card.back_link);
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
    const message = `Custom content project ${project.meta.code} failed validation:\n${errors.join("\n")}`;
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
      acc[curr.code] = curr as EncounterSet;
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
