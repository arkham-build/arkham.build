import { type Card, SKILL_KEYS } from "@arkham-build/shared";
import { Fragment } from "react";
import { cx } from "@/utils/cx";
import { CostIcon } from "../icons/cost-icon";
import { SkillIconFancy } from "../icons/skill-icon-fancy";
import css from "./skill-icons.module.css";

type Props = {
  card: Card;
  className?: string;
  iconClassName?: string;
};

export function SkillIconsInvestigator(props: Props) {
  const { className, card, iconClassName } = props;
  if (card.type_code !== "investigator") return null;

  const entries = SKILL_KEYS.reduce<[string, number][]>((acc, key) => {
    const val = card[`skill_${key}`];
    if (val != null) acc.push([key, val]);
    return acc;
  }, []);

  if (!entries.length) return null;

  return (
    <ol className={cx(css["skills"], className)}>
      {entries.map(([key, val]) => {
        return (
          <Fragment key={key}>
            <li className={cx(css["skill_numbered"], iconClassName)} key={key}>
              <CostIcon className={css["skill-cost"]} cost={val} />
              <SkillIconFancy className={css["skill-icon"]} skill={key} />
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
