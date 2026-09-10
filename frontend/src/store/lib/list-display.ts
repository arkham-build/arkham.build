import type { DecklistConfig } from "@arkham-build/shared";

export const SORTING_PRESETS: DecklistConfig[] = [
  {
    group: ["faction", "type"],
    sort: ["name", "level", "position"],
  },
  {
    group: ["pack", "encounter_set"],
    sort: ["name", "level", "position"],
  },
  {
    group: ["pack"],
    sort: ["position"],
  },
  {
    group: ["pack", "type"],
    sort: ["name", "level", "position"],
  },
  {
    group: ["type", "slot"],
    sort: ["name", "level", "position"],
  },
  {
    group: [],
    sort: ["name", "level", "position"],
  },
  {
    group: ["level"],
    sort: ["name", "level", "position"],
  },
];

export function sortPresetId(config: DecklistConfig): string {
  return [...config.group, ...config.sort].join("|");
}
