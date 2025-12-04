import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { CardsCombobox } from "@/components/cards-combobox";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useStore } from "@/store";
import { filterDuplicates, filterType } from "@/store/lib/filtering";
import { resolveCardWithRelations } from "@/store/lib/resolve-card";
import { makeSortFunction } from "@/store/lib/sorting";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import { official } from "@/utils/card-utils";
import { and } from "@/utils/fp";
import css from "../browser-decklists.module.css";
import type { DecklistFilterProps } from "./shared";

const selectInvestigatorCards = createSelector(
  selectMetadata,
  selectLocaleSortingCollator,
  (metadata, collator) => {
    const investigatorFilter = and([
      filterType(["investigator"]),
      (c) => !!c.deck_options,
      (c) => official(c),
      (c) => filterDuplicates(c) || !!c.parallel,
    ]);

    const investigators = Object.values(metadata.cards).filter(
      investigatorFilter,
    );

    const sortFn = makeSortFunction(
      ["name", "level", "position"],
      metadata,
      collator,
    );

    return investigators.sort(sortFn);
  },
);

export function CanonicalInvestigator({
  disabled,
  formState,
  setFormState,
}: DecklistFilterProps) {
  const { t } = useTranslation();
  const investigators = useStore(selectInvestigatorCards);
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const collator = useStore(selectLocaleSortingCollator);
  const locale = useStore((state) => state.settings.locale);

  const choices = formState.canonicalInvestigatorCode?.split("-");
  const selectedCard = choices ? metadata.cards[choices[1]] : undefined;

  const resolvedCanonicalCard = useMemo(() => {
    if (!selectedCard) return undefined;

    const resolved = resolveCardWithRelations(
      { metadata, lookupTables },
      collator,
      selectedCard.code,
      undefined,
      undefined,
      true,
    );
    // Normalize parallel investigators to base
    if (resolved?.relations?.base) {
      return resolveCardWithRelations(
        { metadata, lookupTables },
        collator,
        resolved.relations.base.card.code,
        undefined,
        undefined,
        true,
      );
    }
    return resolved;
  }, [metadata, lookupTables, collator, selectedCard]);

  const parallelOptions = useMemo(() => {
    if (!resolvedCanonicalCard?.relations?.parallel) return undefined;
    return [
      resolvedCanonicalCard.card.code,
      resolvedCanonicalCard.relations.parallel.card.code,
    ];
  }, [resolvedCanonicalCard]);

  return (
    <Field full>
      <CardsCombobox
        disabled={disabled}
        id="investigator-select"
        items={investigators}
        label={t("common.type.investigator")}
        limit={1}
        locale={locale}
        onValueChange={(cards) => {
          const card = cards[0];
          setFormState((prev) => ({
            ...prev,
            canonicalInvestigatorCode: card
              ? `${card.code}-${card.code}`
              : undefined,
          }));
        }}
        selectedItems={
          resolvedCanonicalCard ? [resolvedCanonicalCard.card] : []
        }
        showLabel
      />
      {!!choices && !!parallelOptions && (
        <div className={css["investigator-version-options"]}>
          <Select
            disabled={disabled}
            onChange={(evt) => {
              const code = evt.target.value;
              setFormState((prev) => ({
                ...prev,
                canonicalInvestigatorCode: `${code}-${choices[1]}`,
              }));
            }}
            options={parallelOptions.map((code, i) => ({
              value: code,
              label:
                i === 0
                  ? t("deck_edit.config.sides.original_front")
                  : t("deck_edit.config.sides.parallel_front"),
            }))}
            required
            value={formState.canonicalInvestigatorCode?.split("-")[0]}
          />
          <Select
            disabled={disabled}
            options={parallelOptions.map((code, i) => ({
              value: code,
              label:
                i === 0
                  ? t("deck_edit.config.sides.original_back")
                  : t("deck_edit.config.sides.parallel_back"),
            }))}
            onChange={(evt) => {
              const code = evt.target.value;
              setFormState((prev) => ({
                ...prev,
                canonicalInvestigatorCode: `${choices[0]}-${code}`,
              }));
            }}
            required
            value={formState.canonicalInvestigatorCode?.split("-")[1]}
          />
        </div>
      )}
    </Field>
  );
}
