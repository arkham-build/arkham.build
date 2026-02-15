import { type Card, SKILL_KEYS } from "@arkham-build/shared";
import { Fragment } from "react";
import { cx } from "@/utils/cx";
import { range } from "@/utils/range";
import { SkillIcon } from "../icons/skill-icon";
import { SkillIconFancy } from "../icons/skill-icon-fancy";
import css from "./skill-icons.module.css";

type Props = {
  asEnemy?: boolean;
  asInvestigator?: boolean;
  card: Card;
  className?: string;
  fancy?: boolean;
  iconClassName?: string;
};

export function SkillIcons(props: Props) {
  const { className, card, fancy, iconClassName } = props;
  if (card.type_code === "investigator") return null;

  const Icon = fancy ? SkillIconFancy : SkillIcon;

  const entries = SKILL_KEYS.reduce<[string, number][]>((acc, key) => {
    const val = card[`skill_${key}`];
    if (val) acc.push([key, val]);
    return acc;
  }, []);

  if (!entries.length) return null;

  return (
    <ol className={cx(css["skills"], className)}>
      {entries.map(([key, val]) => {
        return (
          <Fragment key={key}>
            {range(0, val ?? 0).map((i) => (
              <li className={iconClassName} key={key + i}>
                <Icon skill={key} />
              </li>
            ))}
          </Fragment>
        );
      })}
    </ol>
  );
}
