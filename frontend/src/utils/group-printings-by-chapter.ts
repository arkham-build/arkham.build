import type { Printing } from "@/store/selectors/shared";

export function groupPrintingsByChapter(items: Printing[]) {
  const groups = new Map<number, Printing[]>();

  for (const item of items) {
    const chapter = item.pack.chapter ?? 1;
    const chapterItems = groups.get(chapter);

    if (chapterItems) {
      chapterItems.push(item);
    } else {
      groups.set(chapter, [item]);
    }
  }

  return Array.from(groups.entries()).sort(([a], [b]) => a - b);
}
