import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Plane } from "@/components/ui/plane";
import { useStore } from "@/store";
import type { SearchFilters } from "@/store/slices/decklists-filters.types";
import css from "../browser-decklists.module.css";
import { AnalyzeSideDecks } from "./analyze-side-decks";
import { Author } from "./author";
import { CanonicalInvestigator } from "./canonical-investigator";
import { DeckName } from "./deck-name";
import { DescriptionLength } from "./description-length";
import { ExcludedCards } from "./excluded-cards";
import { InvestigatorFactions } from "./investigator-factions";
import { PublishDate } from "./publish-date";
import { RequiredCards } from "./required-cards";

export function DecklistsFilters() {
  const { t } = useTranslation();
  const filters = useStore((state) => state.decklistsFilters.filters);
  const setFilters = useStore((state) => state.setDecklistsFilters);
  const resetFilters = useStore((state) => state.resetDecklistsFilters);

  const [open, setOpen] = useState(true);
  const [formState, setFormState] = useState<SearchFilters>(filters);

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    setFilters(formState);
  };

  return (
    <Plane className={css["search-container"]}>
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        omitPadding
        title={
          <span className={css["search-title"]}>
            {t("decklists.filters.title")}
          </span>
        }
      >
        <CollapsibleContent>
          <form className={css["search"]} onSubmit={handleSubmit}>
            <div className={css["search-col"]}>
              <CanonicalInvestigator
                disabled={!!formState.investigatorFactions.length}
                formState={formState}
                setFormState={setFormState}
              />
              <InvestigatorFactions
                disabled={!!formState.canonicalInvestigatorCode}
                formState={formState}
                setFormState={setFormState}
              />
              <hr />
              <RequiredCards
                formState={formState}
                setFormState={setFormState}
              />
              <ExcludedCards
                formState={formState}
                setFormState={setFormState}
              />
              <AnalyzeSideDecks
                formState={formState}
                setFormState={setFormState}
              />
            </div>
            <div className={css["search-col"]}>
              <PublishDate formState={formState} setFormState={setFormState} />
              <Author formState={formState} setFormState={setFormState} />
              <DeckName formState={formState} setFormState={setFormState} />
              <DescriptionLength
                formState={formState}
                setFormState={setFormState}
              />
            </div>
            <footer className={css["search-footer"]}>
              <Button type="submit" variant="primary">
                {t("decklists.filters.submit")}
              </Button>
              <Button variant="bare" onClick={resetFilters}>
                {t("common.reset")}
              </Button>
            </footer>
          </form>
        </CollapsibleContent>
      </Collapsible>
    </Plane>
  );
}
