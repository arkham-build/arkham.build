import { cx } from "@/utils/cx";

type Props = {
  className?: string;
  level?: number | null;
  inverted?: boolean;
};

export function LevelIcon(props: Props) {
  const { className, level, inverted } = props;

  const iconName = level == null ? "none" : Math.min(level, 5);

  return (
    <i
      className={cx(
        className,
        inverted ? `icon-inverted_level_${iconName}` : `icon-level_${iconName}`,
        className,
      )}
    />
  );
}
