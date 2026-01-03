import { useCallback, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Card } from "@/store/schemas/card.schema";
import {
  selectActiveListFilter,
  selectCardOptions,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { selectCardMapper } from "@/store/selectors/shared";
import { isInvestigatorCardAccessFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { CardsCombobox } from "../cards-combobox";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilter } from "./primitives/filter-hooks";

export function InvestigatorCardAccessFilter(props: FilterProps) {
  const { id } = props;
  const { t } = useTranslation();

  const { onReset, onChange, onOpenChange, locked } = useFilter<string[]>(id);

  const filter = useStore((state) => selectActiveListFilter(state, id));

  const locale = useStore((state) => state.settings.locale);

  const cards = useStore(selectCardOptions);
  const cardMapper = useStore(selectCardMapper);

  assert(
    isInvestigatorCardAccessFilterObject(filter),
    `InvestigatorCardAccessFilter instantiated with '${filter?.type}'`,
  );

  const value = useMemo(() => filter.value ?? [], [filter.value]);

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const onValueChange = useCallback(
    (value: Card[]) => {
      onChange(value.map((card) => card.code));
    },
    [onChange],
  );

  return (
    <FilterContainer
      changes={changes}
      locked={locked}
      onReset={onReset}
      onOpenChange={onOpenChange}
      open={filter.open}
      title={t("filters.investigator_card_access.title")}
    >
      <CardsCombobox
        disabled={locked}
        autoFocus
        id={`${id}-choose-cards`}
        items={cards}
        locale={locale}
        onValueChange={onValueChange}
        selectedItems={value.map(cardMapper)}
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
        />
      </p>
    </FilterContainer>
  );
}
