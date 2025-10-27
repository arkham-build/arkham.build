import type { Cycle } from "@/store/schemas/cycle.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import type { Metadata } from "@/store/slices/metadata.types";
import { CURRENT_CYCLE_POSITION, RETURN_TO_CYCLES } from "./constants";

export const CAMPAIGN_PLAYALONG_PROJECT_ID =
  "5b6a1f95-73d1-4059-8af2-b9a645efd625";

const CORE_PACKS = ["cycle:investigator", "cycle:core", "rtnotz"];

export function currentEnvironmentPacks(cycles: Cycle[]) {
  const packs = [];

  for (let i = CURRENT_CYCLE_POSITION; i >= CURRENT_CYCLE_POSITION - 2; i--) {
    const cycle = cycles.find((c) => c.position === i);
    if (!cycle) continue;

    if (cycle.code !== "core") {
      packs.push(`${cycle.code}p`);
    }
  }

  packs.push(...CORE_PACKS.filter((c) => c !== "rtnotz"));

  return packs;
}

export function limitedEnvironmentPacks(cycles: Cycle[]) {
  const packs = [];

  for (const cycle of cycles) {
    if (cycle.code !== "core") {
      packs.push(`${cycle.code}p`);
    }

    if (RETURN_TO_CYCLES[cycle.code]) {
      packs.push(RETURN_TO_CYCLES[cycle.code]);
    }
  }

  packs.push(...CORE_PACKS);

  return packs;
}

export function campaignPlayalongPacks(cycle: string) {
  const packs = [];

  if (cycle !== "core") {
    packs.push(`${cycle}p`);
  }

  if (RETURN_TO_CYCLES[cycle]) {
    packs.push(RETURN_TO_CYCLES[cycle]);
  }

  packs.push(...CORE_PACKS);

  return packs;
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
          const reprints = cyclePacks.filter((p) => p.reprint);

          if (reprints.length) {
            selectedPacks.push(
              ...reprints.filter((p) => p.reprint?.type !== "encounter"),
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
