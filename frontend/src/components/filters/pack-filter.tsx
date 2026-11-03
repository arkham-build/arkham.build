import type { Pack } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectListFilterProperties,
  selectPackMapper,
  selectPackOptions,
} from "@/store/selectors/lists";
import { selectMetadata } from "@/store/selectors/shared";
import { environments, resolveLimitedPoolPacks } from "@/utils/environments";
import { displayPackName } from "@/utils/formatting";
import { PackName } from "../pack-name";
import { Button } from "../ui/button";
import type { FilterProps } from "./filters.types";
import { useActiveFilter, useFilter } from "./primitives/filter-hooks";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function PackFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();

  const { filter, changes } = useActiveFilter(id, "pack");

  const listFilterProperties = useStore((state) =>
    selectListFilterProperties(state, resolvedDeck, targetDeck),
  );

  const packMapper = useStore(selectPackMapper);

  const packOptions = useStore((state) =>
    selectPackOptions(state, resolvedDeck, targetDeck),
  );

  const nameRenderer = (pack: Pack) => <PackName pack={pack} />;

  const itemToString = (pack: Pack) => displayPackName(pack).toLowerCase();

  const { onChange } = useFilter<string[]>(id);

  const metadata = useStore(selectMetadata);

  const onApplyCurrentEnvironment = () => {
    onChange(
      resolveLimitedPoolPacks(metadata, environments.current()).map(
        (p) => p.code,
      ),
    );
  };

  const showShortcut = listFilterProperties.cardTypes.has("player");

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      itemToString={itemToString}
      nameRenderer={nameRenderer}
      open={filter.open}
      options={packOptions}
      placeholder={t("filters.pack.placeholder")}
      title={t("filters.pack.title")}
      value={filter.value.map(packMapper)}
    >
      {showShortcut && !changes && (
        <Button size="sm" onClick={onApplyCurrentEnvironment} rounded="xl" full>
          {t("deck_edit.config.card_pool.apply_environment", {
            environment: t("deck_edit.config.card_pool.current"),
          })}
        </Button>
      )}
    </MultiselectFilter>
  );
}
