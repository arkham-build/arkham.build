import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectCardOptions,
  selectInvestigatorCardAccessChanges,
} from "@/store/selectors/lists";
import { isInvestigatorCardAccessFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { CardsCombobox } from "../cards-combobox";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilterCallbacks } from "./primitives/filter-hooks";

export function InvestigatorCardAccessFilter(props: FilterProps) {
  const { id } = props;
  const { t } = useTranslation();

  const { onReset, onChange, onOpenChange } = useFilterCallbacks(id);

  const filter = useStore((state) => selectActiveListFilter(state, id));

  const cards = useStore(selectCardOptions);

  assert(
    isInvestigatorCardAccessFilterObject(filter),
    `InvestigatorCardAccessFilter instantiated with '${filter?.type}'`,
  );

  const value = useMemo(() => filter.value ?? [], [filter.value]);

  const changes = selectInvestigatorCardAccessChanges(value);

  return (
    <FilterContainer
      filterString={changes}
      onReset={onReset}
      onOpenChange={onOpenChange}
      open={filter.open}
      title={t("filters.investigator_card_access.title")}
    >
      <CardsCombobox
        id={`${id}-choose-cards`}
        items={cards}
        onValueChange={onChange}
        selectedItems={value}
        label={t("common.card", { count: 2 })}
      />
      <p className="small">
        <Trans
          t={t}
          i18nKey="filters.investigator_card_access.help"
          components={{
            a: (
              // biome-ignore lint/a11y/useAnchorContent: interpolation.
              <a
                href="https://arkham-starter.com/tool/who"
                target="_blank"
                rel="noreferrer"
              />
            ),
          }}
        >
          If you need more, use arkham-starter's{" "}
          {/* biome-ignore lint/a11y/useValidAnchor: interpolation. */}
          <a>/who tool</a>.
        </Trans>
      </p>
    </FilterContainer>
  );
}
