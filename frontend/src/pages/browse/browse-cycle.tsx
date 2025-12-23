import { useParams } from "wouter";
import PackIcon from "@/components/icons/pack-icon";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { displayPackName } from "@/utils/formatting";
import { BrowseWithFilter } from "./browse-with-filter";

function BrowseCycle() {
  const { cycle_code } = useParams<{ cycle_code: string }>();
  const cycle = useStore((state) =>
    cycle_code ? selectMetadata(state).cycles[cycle_code] : undefined,
  );

  if (!cycle_code || !cycle) return null;

  return (
    <BrowseWithFilter
      filterKey="cycle"
      filterValue={[cycle_code]}
      listKeyPrefix="browse-cycle"
      icon={<PackIcon code={cycle_code} />}
      title={displayPackName(cycle)}
    />
  );
}

export default BrowseCycle;
