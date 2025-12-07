import { cx } from "@/utils/cx";
import css from "./skill-icon-fancy.module.css";

type Props = {
  className?: string;
  skill: string;
};

export function SkillIconFancy(props: Props) {
  const { className, skill } = props;
  return (
    <span className={cx(css["icon"], css[skill], className)}>
      <i className={`icon-skill_${skill}`} />
      <i className={cx(`icon-skill_${skill}_inverted`, css["inverted"])} />
    </span>
  );
}
