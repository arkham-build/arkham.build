import { Combobox } from "@/components/ui/combobox/combobox";
import { useStore } from "@/store";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
} from "@/store/selectors/shared";
import i18n from "@/utils/i18n";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";

type Props = {
  disabled?: boolean;
  id: string;
  limit: number;
  onChange: (selections: string[]) => void;
  readonly?: boolean;
  selections: string[];
};

const selectTraitOptions = createSelector(
  selectLookupTables,
  selectLocaleSortingCollator,
  (lookupTables, collator) =>
    Object.keys(lookupTables.traits)
      .map((code) => {
        const key = `common.traits.${code}`;
        const name = i18n.exists(key) ? i18n.t(key) : code;
        return { code, name };
      })
      .sort((a, b) => collator.compare(a.name, b.name)),
);

export function CustomizationChooseTraits(props: Props) {
  const { disabled, id, limit, onChange, readonly, selections } = props;
  const traits = useStore(selectTraitOptions);
  const { t } = useTranslation();

  const nameRenderer = useCallback(
    (trait: { code: string; name: string }) => trait.name,
    [],
  );

  return (
    <Combobox
      disabled={disabled}
      id={`${id}-choose-trait`}
      items={traits}
      label={t("common.trait", { count: limit })}
      limit={limit}
      readonly={readonly}
      renderItem={nameRenderer}
      renderResult={nameRenderer}
      onValueChange={onChange}
      placeholder={t("deck_edit.customizable.traits_placeholder", {
        count: limit,
      })}
      selectedItems={selections}
    />
  );
}
