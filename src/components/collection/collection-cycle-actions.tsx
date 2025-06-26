import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import css from "./collection.module.css";

type Props = {
  cycleCode: string;
  onToggleCycle: (evt: React.MouseEvent) => void;
  reprint?: boolean;
};

export function CollectionCycleActions(props: Props) {
  const { cycleCode, onToggleCycle, reprint } = props;

  return (
    <div className={css["cycle-actions"]}>
      <Button
        className={css["collection-cycle-toggle"]}
        data-cycle={cycleCode}
        data-reprint={reprint ? "true" : "false"}
        data-val={1}
        onClick={onToggleCycle}
        iconOnly
        type="button"
        variant="bare"
      >
        <PlusIcon />
      </Button>
      <Button
        className={css["cycle-toggle"]}
        data-cycle={cycleCode}
        data-val={0}
        data-reprint={reprint ? "true" : "false"}
        onClick={onToggleCycle}
        iconOnly
        type="button"
        variant="bare"
      >
        <MinusIcon />
      </Button>
    </div>
  );
}
