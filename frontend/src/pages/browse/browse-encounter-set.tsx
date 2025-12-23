import { useParams } from "wouter";
import EncounterIcon from "@/components/icons/encounter-icon";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { BrowseWithFilter } from "./browse-with-filter";

function BrowseEncounterSet() {
  const { encounter_code } = useParams<{ encounter_code: string }>();
  const encounterSet = useStore((state) =>
    encounter_code
      ? selectMetadata(state).encounterSets[encounter_code]
      : undefined,
  );

  if (!encounter_code || !encounterSet) return null;

  return (
    <BrowseWithFilter
      filterKey="encounter_set"
      filterValue={[encounter_code]}
      listKeyPrefix="browse-encounter-set"
      paramValue={encounter_code}
      icon={<EncounterIcon code={encounter_code} />}
      title={encounterSet.name}
    />
  );
}

export default BrowseEncounterSet;
