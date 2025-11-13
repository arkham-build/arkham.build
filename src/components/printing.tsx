import type { Printing as PrintingT } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { displayPackName } from "@/utils/formatting";
import PackIcon from "./icons/pack-icon";
import css from "./printing.module.css";

type Props = {
  className?: string;
  printing: PrintingT;
};

export function Printing({ className, printing }: Props) {
  const { pack, card } = printing;

  return (
    <span className={cx(css["printing"], className)}>
      <span className={css["printing-icon"]}>
        <PackIcon code={pack.code} />
      </span>
      <span>
        {displayPackName(pack)}&#65119;{card.position}
      </span>
      <span>
        <i className="icon-card-outline-bold" />×{card.quantity}
      </span>
    </span>
  );
}
