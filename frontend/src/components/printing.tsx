import type { Card } from "@/store/schemas/card.schema";
import type { Printing as PrintingT } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { displayPackName } from "@/utils/formatting";
import PackIcon from "./icons/pack-icon";
import css from "./printing.module.css";

type Props = {
  active?: boolean;
  className?: string;
  onClick?: (card: Card) => void;
  printing: PrintingT;
};

export function Printing({ active, className, onClick, printing }: Props) {
  const { pack, card } = printing;

  return (
    <PrintingInner
      active={active}
      className={className}
      card={card}
      icon={<PackIcon code={pack.code} />}
      name={displayPackName(pack)}
      onClick={onClick}
      position={card.position}
      quantity={card.quantity}
    />
  );
}

type PrintingInnerProps = {
  active?: boolean;
  card: Card;
  className?: string;
  icon: React.ReactNode;
  name: string;
  onClick?: (card: Card) => void;
  position: number | string;
  quantity?: number;
};

export function PrintingInner({
  active,
  card,
  className,
  icon,
  name,
  onClick,
  position,
  quantity,
}: PrintingInnerProps) {
  const El = onClick ? "button" : "span";

  return (
    <El
      className={cx(css["printing"], active && css["active"], className)}
      onClick={onClick ? () => onClick(card) : undefined}
    >
      <span className={css["printing-icon"]}>{icon}</span> {name}
      <span className="nowrap">&#65119;{position}</span>
      {!!quantity && (
        <>
          {" "}
          <span className="nowrap">
            <i className="icon-card-outline-bold" />×{quantity}
          </span>
        </>
      )}
    </El>
  );
}
