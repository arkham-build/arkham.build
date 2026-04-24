import { selectCyclesAndPacks } from "@/store/selectors/lists";
import { selectLookupTables, selectMetadata } from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import { FAN_MADE_CHAPTER, inferChapterNumber } from "@/utils/chapters";
import type { ChapterTab } from "./set-tree";

export function selectInitialChapterTab(
  state: StoreState,
  activeCode: string | undefined,
  activeType: "cycle" | "pack" | "encounter_set" | "none" | undefined,
): ChapterTab | undefined {
  if (!activeCode || !activeType || activeType === "none") return undefined;

  if (activeType === "cycle") {
    const cycle = selectCyclesAndPacks(state).find(
      (c) => c.code === activeCode,
    );
    if (!cycle) return undefined;
    const chapter = inferChapterNumber(cycle.packs[0]);

    return chapter === FAN_MADE_CHAPTER
      ? "fan-made"
      : (chapter.toString() as ChapterTab);
  }

  const metadata = selectMetadata(state);

  if (activeType === "pack") {
    const pack = metadata.packs[activeCode];
    if (!pack) return undefined;

    const chapter = inferChapterNumber(pack);

    return chapter === FAN_MADE_CHAPTER
      ? "fan-made"
      : (chapter.toString() as ChapterTab);
  }

  if (activeType === "encounter_set") {
    const lookupTables = selectLookupTables(state);
    const packCode = Object.keys(lookupTables.encounterCodesByPack).find(
      (p) => lookupTables.encounterCodesByPack[p]?.[activeCode],
    );
    const pack = packCode ? metadata.packs[packCode] : undefined;
    if (!pack) return undefined;

    const chapter = inferChapterNumber(pack);

    return chapter === FAN_MADE_CHAPTER
      ? "fan-made"
      : (chapter.toString() as ChapterTab);
  }

  return undefined;
}
