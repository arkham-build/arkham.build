import { useMemo } from "react";
import { useStore } from "@/store";
import { resolveDeck } from "@/store/lib/resolve-deck";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import type { DeckSearchResult } from "@/store/services/requests/decklist-search";
import { DeckSummary } from "../deck-summary/deck-summary";
import { ArkhamdbDecklistMeta } from "./arkhamdb-decklist-meta";

export function ArkhamDBDecklistResult({
  result,
}: {
  result: DeckSearchResult;
}) {
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const sharing = useStore((state) => state.sharing);
  const collator = useStore(selectLocaleSortingCollator);

  const resolved = useMemo(() => {
    const deps = { lookupTables, metadata, sharing };
    return resolveDeck(deps, collator, {
      ...result,
      source: "arkhamdb",
    });
  }, [result, lookupTables, metadata, sharing, collator]);

  return (
    <DeckSummary deck={resolved} interactive showThumbnail type="decklist">
      <ArkhamdbDecklistMeta
        date_creation={result.date_creation}
        like_count={result.like_count}
        user_id={result.user_id as number}
        user_name={result.user_name}
        user_reputation={result.user_reputation}
      />
    </DeckSummary>
  );
}
