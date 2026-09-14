import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectDeckFilterValue,
  selectDecksMinMaxXpCost,
  selectXpCostChanges,
} from "@/store/selectors/deck-collection";
import { FilterContainer } from "../filters/primitives/filter-container";
import { RangeSelect } from "../ui/range-select";

type Props = {
  containerClass?: string;
};

export function DeckXPCostFilter({ containerClass }: Props) {
  const { t } = useTranslation();

  const changes = useStore(selectXpCostChanges);
  const [min, max] = useStore(selectDecksMinMaxXpCost);

  const value = useStore((state) => selectDeckFilterValue(state, "xpCost"));
  const open = useStore((state) => state.deckCollection.open.xpCost);

  const setFilterOpen = useStore((state) => state.setDeckFilterOpen);
  const resetFilter = useStore((state) => state.resetDeckFilter);
  const setFilterValue = useStore((state) => state.addDecksFilter);

  const onReset = () => {
    resetFilter("xpCost");
  };

  const onOpenChange = (val: boolean) => {
    setFilterOpen("xpCost", val);
  };

  const onValueCommit = (value: [number, number]) => {
    setFilterValue("xpCost", value);
  };

  return (
    min !== max && (
      <FilterContainer
        changes={changes}
        className={containerClass}
        onOpenChange={onOpenChange}
        onReset={onReset}
        open={open}
        title={t("deck.stats.xp_required")}
      >
        <RangeSelect
          data-testid="filters-cost-range"
          id="cost-select"
          label={t("common.xp", { count: 2 })}
          max={max}
          min={min}
          onValueCommit={onValueCommit}
          value={(value as [number, number]) ?? [min, max]}
        />
      </FilterContainer>
    )
  );
}
