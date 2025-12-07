import { numericalIcon } from "@/utils/card-utils";
import { cx } from "@/utils/cx";

type Props = {
  className?: string;
  cost?: string | number | null;
  style?: React.CSSProperties;
} & React.ComponentPropsWithoutRef<"span">;

export function CostIcon(props: Props) {
  const { className, cost, ...rest } = props;

  if (cost && typeof cost === "number" && cost >= 10) {
    return (
      <span {...rest} className={className}>
        <CostIcon cost={cost.toString().split("")[0]} />
        <CostIcon cost={cost.toString().split("")[1]} />
      </span>
    );
  }

  return <span {...rest} className={cx(className, numericalIcon(cost))} />;
}
