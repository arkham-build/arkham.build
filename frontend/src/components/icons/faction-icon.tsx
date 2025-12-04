import { cx } from "@/utils/cx";

type Props = {
  className?: string;
  code: string;
};

export function FactionIcon(props: Props) {
  return <i className={cx(props.className, `icon-${props.code}`)} />;
}
