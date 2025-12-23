import { useParams } from "wouter";
import PackIcon from "@/components/icons/pack-icon";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { displayPackName } from "@/utils/formatting";
import { BrowseWithFilter } from "./browse-with-filter";

function BrowsePack() {
  const { pack_code } = useParams<{ pack_code: string }>();
  const pack = useStore((state) =>
    pack_code ? selectMetadata(state).packs[pack_code] : undefined,
  );

  if (!pack_code || !pack) return null;

  return (
    <BrowseWithFilter
      filterKey="pack"
      filterValue={[pack_code]}
      listKeyPrefix="browse-pack"
      icon={<PackIcon code={pack_code} />}
      title={displayPackName(pack)}
    />
  );
}

export default BrowsePack;
