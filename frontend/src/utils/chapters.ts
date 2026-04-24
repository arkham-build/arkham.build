import type { Pack } from "@/store/schemas/pack.schema";
import type { Printing } from "@/store/selectors/shared";

export const FAN_MADE_CHAPTER = 99;

export function inferChapterNumber(pack: Pack) {
  if (!pack) return 1;
  if (pack.official === false) return FAN_MADE_CHAPTER;
  return pack.chapter ?? 1;
}

export function groupPrintingsByChapter(items: Printing[]) {
  const groups = new Map<number, Printing[]>();

  for (const item of items) {
    const chapter = inferChapterNumber(item.pack);
    const chapterItems = groups.get(chapter);

    if (chapterItems) {
      chapterItems.push(item);
    } else {
      groups.set(chapter, [item]);
    }
  }

  return Array.from(groups.entries()).sort(([a], [b]) => a - b);
}
