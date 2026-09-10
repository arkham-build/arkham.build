import type { Card } from "@arkham-build/shared";
import { ListCard } from "@/components/list-card/list-card";
import { ResultTag } from "@/components/ui/combobox/combobox-results";

type Props = {
  card: Card;
};

export function SignatureLink(props: Props) {
  const { card } = props;

  return (
    <ResultTag>
      <ListCard
        card={card}
        cardLevelDisplay="icon-only"
        cardShowCollectionNumber
        omitBorders
        omitThumbnail
        size="xs"
      />
    </ResultTag>
  );
}
