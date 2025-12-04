import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Plane } from "@/components/ui/plane";
import type { DecklistsFiltersState } from "@/store/services/requests/decklists-search";
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

type Props = {
  filters: DecklistsFiltersState["filters"];
  onFiltersChange: (state: DecklistsFiltersState["filters"]) => void;
  onFiltersReset: () => void;
};

export function DecklistsFilters({
  filters,
  onFiltersChange,
  onFiltersReset,
}: Props) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(true);
  const [formState, setFormState] =
    useState<DecklistsFiltersState["filters"]>(filters);

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    onFiltersChange(formState);
  };

  return (
    <Plane>
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        omitPadding
        title={
          <span className={css["filters-title"]}>
            {t("decklists.filters.title")}
          </span>
        }
      >
        <CollapsibleContent>
          <form className={css["filters"]} onSubmit={handleSubmit}>
            <div className={css["filters-col"]}>
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
            <div className={css["filters-col"]}>
              <PublishDate formState={formState} setFormState={setFormState} />
              <Author formState={formState} setFormState={setFormState} />
              <DeckName formState={formState} setFormState={setFormState} />
              <DescriptionLength
                formState={formState}
                setFormState={setFormState}
              />
            </div>
            <footer className={css["filters-footer"]}>
              <Button type="submit" variant="primary">
                {t("decklists.filters.submit")}
              </Button>
              <Button variant="bare" onClick={onFiltersReset}>
                {t("common.reset")}
              </Button>
            </footer>
          </form>
        </CollapsibleContent>
      </Collapsible>
    </Plane>
  );
}
