import type { StoreState } from "@/store/slices";
import { inferChapterNumber } from "@/utils/chapters";

function migrate(_state: unknown, version: number) {
  const state = _state as StoreState;

  if (version < 8) {
    const cards = state.metadata?.cards;
    const packs = state.metadata?.packs;

    if (!cards || !packs) {
      return state;
    }

    for (const card of Object.values(cards)) {
      card.chapter = inferChapterNumber(packs[card.pack_code]);
    }
  }

  return state;
}

export default migrate;
