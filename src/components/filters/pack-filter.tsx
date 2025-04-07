import { useStore } from "@/store";
import {
  selectActiveList,
  selectActiveListFilter,
  selectFilterChanges,
  selectPackOptions,
} from "@/store/selectors/lists";
import type { Pack } from "@/store/services/queries.types";
import { isPackFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { shortenPackName } from "@/utils/formatting";
import { useResolvedDeck } from "@/utils/use-resolved-deck";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PackName } from "../pack-name";
import type { FilterProps } from "./filters.types";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function PackFilter({ id }: FilterProps) {
  const ctx = useResolvedDeck();
  const { t } = useTranslation();

  const filter = useStore((state) => selectActiveListFilter(state, id));

  const activeList = useStore(selectActiveList);

  assert(
    isPackFilterObject(filter),
    `PackFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );

  const packOptions = useStore(selectPackOptions);
  const options = useMemo(
    () =>
      packOptions.filter((pack) => {
        const cardPool = ctx.resolvedDeck?.metaParsed?.card_pool;

        return cardPool && activeList?.cardType === "player"
          ? cardPool.includes(pack.code) || filter.value.includes(pack.code)
          : true;
      }),
    [filter.value, ctx.resolvedDeck, packOptions, activeList],
  );

  const nameRenderer = useCallback(
    (pack: Pack) => <PackName pack={pack} shortenNewFormat />,
    [],
  );

  const itemToString = useCallback(
    (pack: Pack) => shortenPackName(pack).toLowerCase(),
    [],
  );

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      itemToString={itemToString}
      nameRenderer={nameRenderer}
      open={filter.open}
      options={options}
      placeholder={t("filters.pack.placeholder")}
      title={t("filters.pack.title")}
      value={filter.value}
    />
  );
}
