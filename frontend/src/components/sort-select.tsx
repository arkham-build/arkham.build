import type { DecklistConfig } from "@arkham-build/shared";
import type { TFunction } from "i18next";
import { ChevronRightIcon, ChevronsRightIcon } from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { SORTING_PRESETS, sortPresetId } from "@/store/lib/list-display";
import { DEFAULT_LIST_SORT_ID } from "@/utils/constants";
import { isEmpty } from "@/utils/is-empty";
import css from "./sort-select.module.css";
import { DropdownRadioGroupItem } from "./ui/dropdown-menu";
import { RadioGroup } from "./ui/radio-group";

type Props = {
  onConfigChange: (config: DecklistConfig | undefined) => void;
  selectedId: string;
};

export function SortSelect({ onConfigChange, selectedId }: Props) {
  const { t } = useTranslation();

  const presets = SORTING_PRESETS.toSorted((a, b) =>
    sortPresetLabelString(a, t).localeCompare(sortPresetLabelString(b, t)),
  );

  const onSelectSortPreset = (id: string) => {
    if (id === DEFAULT_LIST_SORT_ID) {
      onConfigChange(undefined);
    } else {
      const preset = presets.find((config) => sortPresetId(config) === id);
      onConfigChange(preset);
    }
  };

  return (
    <RadioGroup value={selectedId} onValueChange={onSelectSortPreset}>
      <DropdownRadioGroupItem value={DEFAULT_LIST_SORT_ID}>
        {t("lists.nav.sort_default")}
      </DropdownRadioGroupItem>
      {presets.map((config) => {
        return (
          <DropdownRadioGroupItem
            key={sortPresetId(config)}
            value={sortPresetId(config)}
          >
            <span className={css["sort-label"]}>
              {config.group.map((key, i) => (
                <Fragment key={key}>
                  {t(`lists.categories.${key}`)}
                  {i < config.group.length - 1 ? (
                    <ChevronsRightIcon />
                  ) : (
                    <ChevronRightIcon />
                  )}
                </Fragment>
              ))}
              {t(`lists.categories.${config.sort[0]}`)}
            </span>
          </DropdownRadioGroupItem>
        );
      })}
    </RadioGroup>
  );
}

function sortPresetLabelString(config: DecklistConfig, t: TFunction) {
  const parts: string[] = [...config.group];

  if (!isEmpty(config.sort)) {
    parts.push(config.sort[0]);
  }

  return parts.map((key) => t(`lists.categories.${key}`)).join("");
}
