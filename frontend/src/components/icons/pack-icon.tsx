import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { getPackIcon } from "./pack-icon.helpers";

type Props = {
  code?: string;
  className?: string;
  invert?: boolean;
};

function PackIcon(props: Props) {
  const { code, className, invert } = props;
  const icon = getPackIcon(code);

  const pack = useStore((state) =>
    code ? selectMetadata(state).packs[code] : undefined,
  );

  if (pack?.icon_url) {
    return (
      <img
        alt={`Pack icon: ${pack.code}`}
        className={cx("external-icon", className, invert && "invert")}
        src={pack.icon_url}
      />
    );
  }

  return icon ? <i className={cx(`encounters-${icon}`, className)} /> : null;
}

export default PackIcon;
