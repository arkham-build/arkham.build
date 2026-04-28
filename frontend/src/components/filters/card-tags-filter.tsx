import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilter,
  selectCardTagOptions,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isCardTagsFilterObject } from "@/store/slices/lists.type-guards";
import type { CardTagScope } from "@/store/slices/lists.types";
import { assert } from "@/utils/assert";
import { cx } from "@/utils/cx";
import css from "./card-tags-filter.module.css";
import type { FilterProps } from "./filters.types";
import { FilterContainer } from "./primitives/filter-container";
import { useFilter } from "./primitives/filter-hooks";

export function CardTagsFilter({ id, resolvedDeck }: FilterProps) {
  const { t } = useTranslation();
  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isCardTagsFilterObject(filter),
    `CardTagsFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const tagOptions = useStore((state) =>
    selectCardTagOptions(state, resolvedDeck?.cardTags ?? {}),
  );

  const { onReset, onOpenChange, onChange, locked } = useFilter(id);

  const onTagToggle = useCallback(
    (tag: string) => {
      const current = filter.value.tags;
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      onChange({ ...filter.value, tags: next });
    },
    [filter.value, onChange],
  );

  const onScopeChange = useCallback(
    (scope: CardTagScope) => {
      onChange({ ...filter.value, scope });
    },
    [filter.value, onChange],
  );

  return (
    <FilterContainer
      changes={changes || undefined}
      locked={locked}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={filter.open}
      title={t("filters.card_tags.title")}
    >
      <div className={css["container"]}>
        <select
          className={css["scope-select"]}
          value={filter.value.scope}
          onChange={(e) => onScopeChange(e.target.value as CardTagScope)}
        >
          <option value="both">{t("filters.card_tags.scope_both")}</option>
          <option value="deck">{t("filters.card_tags.scope_deck")}</option>
          <option value="global">{t("filters.card_tags.scope_global")}</option>
        </select>

        {tagOptions.length === 0 ? (
          <p className={css["empty-message"]}>
            {t("filters.card_tags.placeholder")}
          </p>
        ) : (
          <div className={css["tags-list"]}>
            {tagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                className={cx(
                  css["tag-button"],
                  filter.value.tags.includes(tag) && css["active"],
                )}
                onClick={() => onTagToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </FilterContainer>
  );
}
