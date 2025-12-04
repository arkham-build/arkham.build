import { splitMultiValue } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./card-slots.module.css";
import SlotIcon from "./icons/slot-icon";

type Props = {
  className?: string;
  slot: string;
};

export function CardSlots(props: Props) {
  const { className, slot } = props;
  return (
    <ol className={cx(css["slots"], className)}>
      {splitMultiValue(slot).map((slot) => (
        <li key={slot}>
          <SlotIcon code={slot} />
        </li>
      ))}
    </ol>
  );
}
