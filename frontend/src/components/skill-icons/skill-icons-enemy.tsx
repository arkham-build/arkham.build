import { Fragment } from "react";
import type { Card } from "@/store/schemas/card.schema";
import { cx } from "@/utils/cx";
import { CostIcon } from "../icons/cost-icon";
import { SkillIconFancy } from "../icons/skill-icon-fancy";
import css from "./skill-icons.module.css";

type Props = {
  card: Card;
  className?: string;
  iconClassName?: string;
};

export function SkillIconsEnemy(props: Props) {
  const { className, card, iconClassName } = props;

  const entries: [
    string,
    number | null | undefined,
    boolean | null | undefined,
  ][] = [
    ["combat", card.enemy_fight, card.enemy_fight_per_investigator],
    ["health", card.health, card.health_per_investigator],
    ["agility", card.enemy_evade, card.enemy_evade_per_investigator],
  ];

  return (
    <ol className={cx(css["skills"], className)}>
      {entries.map(([key, val, perInvestigator]) => {
        return (
          <Fragment key={key}>
            <li className={cx(css["skill_numbered"], iconClassName)} key={key}>
              <CostIcon className={css["skill-cost"]} cost={val} />
              {perInvestigator && (
                <i
                  className={cx(
                    css["skill-per-investigator"],
                    "icon-per_investigator",
                  )}
                />
              )}
              {key !== "health" && (
                <SkillIconFancy className={css["skill-icon"]} skill={key} />
              )}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
