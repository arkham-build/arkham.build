import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import css from "./collection.module.css";

type Props = {
  chapter: string;
  onToggleChapter: (evt: React.MouseEvent) => void;
};

export function CollectionChapterActions(props: Props) {
  const { chapter, onToggleChapter } = props;

  return (
    <div className={css["cycle-actions"]}>
      <Button
        data-chapter={chapter}
        data-val={1}
        onClick={onToggleChapter}
        iconOnly
        type="button"
        variant="bare"
        size="sm"
      >
        <PlusIcon />
      </Button>
      <Button
        data-chapter={chapter}
        data-val={0}
        onClick={onToggleChapter}
        iconOnly
        type="button"
        variant="bare"
        size="sm"
      >
        <MinusIcon />
      </Button>
    </div>
  );
}
