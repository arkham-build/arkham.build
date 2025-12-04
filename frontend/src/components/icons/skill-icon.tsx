import { cx } from "@/utils/cx";

type Props = {
  className?: string;
  skill: string;
};

export function SkillIcon(props: Props) {
  return props.skill ? (
    <i className={cx(`icon-${props.skill}`, props.className)} />
  ) : null;
}
