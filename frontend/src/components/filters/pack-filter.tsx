import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Pack } from "@/store/schemas/pack.schema";
import {
  selectActiveListFilter,
  selectCampaignCycles,
  selectFilterChanges,
  selectListFilterProperties,
  selectPackMapper,
  selectPackOptions,
} from "@/store/selectors/lists";
import { selectMetadata } from "@/store/selectors/shared";
import { isPackFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import {
  currentEnvironmentPacks,
  resolveLimitedPoolPacks,
} from "@/utils/environments";
import { displayPackName } from "@/utils/formatting";
import { PackName } from "../pack-name";
import { Button } from "../ui/button";
import type { FilterProps } from "./filters.types";
import { useFilter } from "./primitives/filter-hooks";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function PackFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  const listFilterProperties = useStore((state) =>
    selectListFilterProperties(state, resolvedDeck, targetDeck),
  );

  assert(
    isPackFilterObject(filter),
    `PackFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const packMapper = useStore(selectPackMapper);

  const packOptions = useStore((state) =>
    selectPackOptions(state, resolvedDeck, targetDeck),
  );

  const nameRenderer = useCallback(
    (pack: Pack) => <PackName pack={pack} />,
    [],
  );

  const itemToString = useCallback(
    (pack: Pack) => displayPackName(pack).toLowerCase(),
    [],
  );

  const { onChange } = useFilter<string[]>(id);

  const metadata = useStore(selectMetadata);
  const cycles = useStore(selectCampaignCycles);

  const onApplyCurrentEnvironment = useCallback(() => {
    onChange(
      resolveLimitedPoolPacks(metadata, currentEnvironmentPacks(cycles)).map(
        (p) => p.code,
      ),
    );
  }, [cycles, onChange, metadata]);

  const showShortcut =
    listFilterProperties.cardTypes.has("player") &&
    listFilterProperties.levels.size > 1;

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
        <Button
          size="sm"
          onClick={onApplyCurrentEnvironment}
          variant="secondary"
        >
          {t("deck_edit.config.card_pool.apply_environment", {
            environment: t("deck_edit.config.card_pool.current"),
          })}
        </Button>
      )}
    </MultiselectFilter>
  );
}
