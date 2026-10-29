import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";

type Props = {
  code?: string | null;
  className?: string;
  invert?: boolean;
};

function EncounterIcon(props: Props) {
  const { code, className, invert } = props;

  const iconId = getEncounterIcon(code);

  const encounterSet = useStore((state) =>
    code ? selectMetadata(state).encounterSets[code] : undefined,
  );

  if (encounterSet?.icon_url) {
    return (
      <img
        alt={`Encounter set icon: ${encounterSet.code}`}
        className={cx("external-icon", className, invert && "invert")}
        src={encounterSet.icon_url}
      />
    );
  }

  return iconId ? (
    <i className={cx(`encounters-${iconId}`, className)} />
  ) : null;
}

export default EncounterIcon;
