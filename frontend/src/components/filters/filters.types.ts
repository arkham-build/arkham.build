import type { ResolvedDeck } from "@/store/lib/types";
import type { TargetDeck } from "@/store/selectors/lists";

export type FilterProps = {
  id: number;
  resolvedDeck: ResolvedDeck | undefined;
  targetDeck: TargetDeck | undefined;
};
