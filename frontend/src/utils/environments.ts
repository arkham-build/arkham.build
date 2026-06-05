import type { Cycle } from "@/store/schemas/cycle.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import type { Metadata } from "@/store/slices/metadata.types";
import { RETURN_TO_CYCLES } from "./constants";

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
