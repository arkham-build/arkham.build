import type { Card } from "@/store/schemas/card.schema";
import type { Printing as PrintingT } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { displayPackName } from "@/utils/formatting";
import PackIcon from "./icons/pack-icon";
import css from "./printing.module.css";

type Props = {
  active?: boolean;
  actionNode?: React.ReactNode;
  className?: string;
  printing: PrintingT;
};

export function Printing({ actionNode, active, className, printing }: Props) {
  const { pack, card } = printing;

  return (
    <PrintingInner
      active={active}
      actionNode={actionNode}
      className={className}
      card={card}
      icon={<PackIcon code={pack.code} />}
      name={
        <a
          className="link-current"
          href={`/browse/pack/${pack.code}`}
          target="_blank"
          rel="noreferrer"
        >
          {displayPackName(pack)}
        </a>
      }
      position={card.position}
      quantity={card.quantity}
    />
  );
}

type PrintingInnerProps = {
  actionNode?: React.ReactNode;
  active?: boolean;
  card: Card;
  className?: string;
  icon: React.ReactNode;
  name: React.ReactNode;
  position: number | string;
  quantity?: number;
};

export function PrintingInner({
  active,
  actionNode,
  className,
  icon,
  name,
  position,
  quantity,
}: PrintingInnerProps) {
  return (
    <span className={cx(css["printing"], active && css["active"], className)}>
      <span className={css["printing-icon"]}>{icon}</span> {name}
      <span className="nowrap">
        <small>&nbsp;#&nbsp;</small>
        {position}
      </span>
      {!!quantity && (
        <>
          {" "}
          <span className="nowrap">
            <i className="icon-card-outline-bold" />×{quantity}
          </span>
        </>
      )}
      {actionNode && (
        <span className={css["printing-action"]}>{actionNode}</span>
      )}
    </span>
  );
}
