import type { StoreState } from "../slices";

export function selectStarterDeckForInvestigator(
  state: StoreState,
  code: string,
) {
  return state.starterDecks.find((d) => d.investigator_code === code);
}
