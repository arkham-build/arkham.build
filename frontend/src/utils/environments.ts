import type { Cycle, Pack } from "@arkham-build/shared";
import type { CycleWithPacks } from "@/store/selectors/lists";
import type { Metadata } from "@/store/slices/metadata.types";
import { inferChapterNumber } from "./chapters";
import { RETURN_TO_CYCLES } from "./constants";

const NON_DECKBUILDING_POOL_CYCLE_CODES = new Set([
  "parallel",
  "promotional",
  "side_stories",
]);

export function isDeckbuildingPoolPack(pack: Pick<Pack, "cycle_code">) {
  return !NON_DECKBUILDING_POOL_CYCLE_CODES.has(pack.cycle_code);
}

export type ProgressionTarget = {
  code: string;
  dateRelease: string;
  name: string;
};

export function progressionTargets(
  metadata: Metadata,
  showPreviews: boolean,
): ProgressionTarget[] {
  const now = Date.now();
  const packs = Object.values(metadata.packs);
  const reprintedCampaignPacks = reprintedCampaignPackCodes(packs);
  const targets: ProgressionTarget[] = [];

  for (const pack of packs) {
    if (!isProgressionTargetPack(pack, reprintedCampaignPacks)) continue;

    const dateRelease = progressionPackReleaseDate(pack, metadata);
    if (!showPreviews && Date.parse(dateRelease) > now) continue;

    targets.push({
      code: pack.code,
      dateRelease,
      name: progressionTargetName(pack, metadata),
    });
  }

  return targets.sort((a, b) => {
    const dateOrder = Date.parse(a.dateRelease) - Date.parse(b.dateRelease);
    return dateOrder || a.name.localeCompare(b.name);
  });
}

export const environments = {
  current() {
    return ["cycle:core_ch2", "cycle:investigator_decks_ch2"];
  },
  limited(packs: string[]) {
    return [
      ...packs.flatMap((code) => {
        const cycle = code.substring(0, code.length - 1);
        if (RETURN_TO_CYCLES[cycle]) {
          return [code, RETURN_TO_CYCLES[cycle]];
        }
        return [code];
      }),
      "cycle:core_ch2",
      "cycle:investigator_decks_ch2",
    ];
  },
  progression(metadata: Metadata, dateRelease: string) {
    const cutoff = Date.parse(dateRelease);
    if (Number.isNaN(cutoff)) {
      throw new Error(`Invalid progression release date: ${dateRelease}`);
    }

    const packs = Object.values(metadata.packs);
    const packCodes = new Set<string>();

    for (const card of Object.values(metadata.cards)) {
      if (card.encounter_code) continue;

      const pack = metadata.packs[card.pack_code];

      if (
        pack &&
        pack.official !== false &&
        isDeckbuildingPoolPack(pack) &&
        pack.date_release &&
        Date.parse(pack.date_release) <= cutoff
      ) {
        packCodes.add(pack.code);
      }
    }

    for (const pack of packs) {
      if (
        pack.reprint_type !== "player" ||
        pack.official === false ||
        !isDeckbuildingPoolPack(pack) ||
        Date.parse(progressionPackReleaseDate(pack, metadata)) > cutoff
      ) {
        continue;
      }

      for (const reprintedPackCode of pack.reprint_packs ?? []) {
        packCodes.delete(reprintedPackCode);
      }

      packCodes.add(pack.code);
    }

    return packs
      .filter((pack) => packCodes.has(pack.code))
      .sort((a, b) => {
        const dateOrder =
          Date.parse(progressionPackReleaseDate(a, metadata)) -
          Date.parse(progressionPackReleaseDate(b, metadata));

        return dateOrder || a.position - b.position;
      })
      .map((pack) => pack.code);
  },
  chapter(cycles: CycleWithPacks[], chapter: 2 | 1) {
    const packs = new Set<string>();

    for (const cycle of cycles) {
      const seen = new Set<string>();

      for (const reprint of cycle.reprintPacks) {
        if (
          inferChapterNumber(reprint) !== chapter ||
          reprint.reprint_type === "campaign"
        ) {
          continue;
        }

        for (const reprinted of reprint.reprint_packs ?? []) {
          seen.add(reprinted);
        }

        packs.add(reprint.code);
      }

      for (const pack of cycle.packs) {
        if (
          seen.has(pack.code) ||
          inferChapterNumber(pack) !== chapter ||
          !isDeckbuildingPoolPack(pack)
        ) {
          continue;
        }

        packs.add(pack.code);
      }
    }

    return Array.from(packs);
  },
  cpa(cycle: string, chapter: 2 | 1) {
    const packs = [];

    if (cycle === "core") {
      packs.push("rcore");
    } else if (cycle === "core_2026") {
      packs.push("core_2026");
    } else {
      packs.push(`${cycle}p`);
    }

    if (RETURN_TO_CYCLES[cycle]) {
      packs.push(RETURN_TO_CYCLES[cycle]);
    }

    if (chapter === 2) {
      packs.push("cycle:core_ch2", "cycle:investigator_decks_ch2");
    } else {
      packs.push("cycle:investigator", "cycle:core", "rtnotz");
    }

    return packs;
  },
  currentFaq25(cycles: Cycle[]) {
    const CURRENT_CYCLE_POSITION = 11;

    const packs = [];

    for (let i = CURRENT_CYCLE_POSITION; i >= CURRENT_CYCLE_POSITION - 2; i--) {
      const cycle = cycles.find((c) => c.position === i);
      if (!cycle) continue;

      if (cycle.code !== "core") {
        packs.push(`${cycle.code}p`);
      }
    }

    packs.push("cycle:investigator", "cycle:core");

    return packs;
  },
  limitedFaq25(cycles: Cycle[]) {
    const packs = [];

    for (const cycle of cycles) {
      if (cycle.code !== "core") {
        packs.push(`${cycle.code}p`);
      }

      if (RETURN_TO_CYCLES[cycle.code]) {
        packs.push(RETURN_TO_CYCLES[cycle.code]);
      }
    }

    packs.push("cycle:investigator", "cycle:core", "rtnotz");

    return packs;
  },
};

function reprintedCampaignPackCodes(packs: readonly Pack[]) {
  const result = new Set<string>();

  for (const pack of packs) {
    if (pack.reprint_type !== "campaign") continue;
    for (const code of pack.reprint_packs ?? []) result.add(code);
  }

  return result;
}

function isProgressionTargetPack(
  pack: Pack,
  reprintedCampaignPacks: ReadonlySet<string>,
) {
  if (pack.official === false || !pack.date_release) {
    return false;
  }

  switch (pack.type) {
    case "campaign_expansion":
    case "core_set":
    case "parallel_investigator":
    case "return_to":
    case "standalone_scenario":
      return true;
    case "deluxe_expansion":
      return !reprintedCampaignPacks.has(pack.code);
    default:
      return pack.code === "core_2026";
  }
}

function progressionTargetName(pack: Pack, metadata: Metadata) {
  if (pack.type === "campaign_expansion") {
    const cycle = metadata.cycles[pack.cycle_code];
    if (cycle) return cycle.name ?? cycle.real_name;
  }

  return pack.name ?? pack.real_name;
}

function progressionPackReleaseDate(pack: Pack, metadata: Metadata) {
  if (pack.reprint_type !== "player" && pack.reprint_type !== "campaign") {
    if (!pack.date_release) {
      throw new Error(`Pack has no release date: ${pack.code}`);
    }

    return pack.date_release;
  }

  let latest: string | undefined;

  for (const code of pack.reprint_packs ?? []) {
    const date = metadata.packs[code]?.date_release;
    if (!date) {
      throw new Error(`Reprint pack has incomplete metadata: ${pack.code}`);
    }

    if (!latest || Date.parse(date) > Date.parse(latest)) latest = date;
  }

  if (!latest) throw new Error(`Reprint pack has no originals: ${pack.code}`);
  return latest;
}

export function resolveLimitedPoolPacks(
  metadata: Metadata,
  cardPool: string[] | undefined,
) {
  if (!cardPool) return [];

  const selectedPacks: Pack[] = [];
  const packs = Object.values(metadata.packs);

  for (const code of cardPool) {
    if (code.startsWith("cycle:")) {
      const cycleCode = code.replace("cycle:", "");
      const cycle = metadata.cycles[cycleCode];

      if (cycle) {
        const cyclePacks = packs
          .filter((p) => p.cycle_code === cycle.code)
          .sort((a, b) => a.position - b.position);

        if (cycle.code === "core") {
          selectedPacks.push(...cyclePacks);
        } else {
          const reprints = cyclePacks.filter((p) => p.reprint_type);

          if (reprints.length) {
            selectedPacks.push(
              ...reprints.filter((p) => p.reprint_type !== "campaign"),
            );
          } else {
            selectedPacks.push(...cyclePacks);
          }
        }
      }
    } else if (!code.startsWith("card:")) {
      const pack = metadata.packs[code];
      if (pack) {
        selectedPacks.push(pack);
      }
    }
  }

  return selectedPacks;
}
