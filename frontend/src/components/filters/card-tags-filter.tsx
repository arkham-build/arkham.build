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
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <select
          value={filter.value.scope}
          onChange={(e) => onScopeChange(e.target.value as CardTagScope)}
          style={{ fontSize: "var(--text-xs)", padding: "0.25rem" }}
        >
          <option value="both">{t("filters.card_tags.scope_both")}</option>
          <option value="deck">{t("filters.card_tags.scope_deck")}</option>
          <option value="global">{t("filters.card_tags.scope_global")}</option>
        </select>

        {tagOptions.length === 0 ? (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
            {t("filters.card_tags.placeholder")}
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
            {tagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagToggle(tag)}
                style={{
                  fontSize: "var(--text-xs)",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "var(--rounded)",
                  background: filter.value.tags.includes(tag)
                    ? "var(--color-primary)"
                    : "var(--palette-1)",
                  color: filter.value.tags.includes(tag)
                    ? "var(--color-primary-text)"
                    : "var(--text)",
                  border: "none",
                  cursor: "pointer",
                }}
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
