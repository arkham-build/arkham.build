import type { Card } from "@/store/services/queries.types";
import { cx } from "@/utils/cx";
import { Fragment } from "react";
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
  if (card.type_code !== "enemy") return null;

  const entries: [string, number | undefined][] = [
    ["combat", card.enemy_fight],
    ["health", card.health],
    ["agility", card.enemy_evade],
  ];

  return (
    <ol className={cx(css["skills"], className)}>
      {entries.map(([key, val]) => {
        return (
          <Fragment key={key}>
            <li className={cx(css["skill_numbered"], iconClassName)} key={key}>
              <CostIcon className={css["skill-cost"]} cost={val} />
              {key === "health" ? (
                <>
                  {card.health_per_investigator ? (
                    <i className="icon-per_investigator" />
                  ) : (
                    <div className={css["skill-stub"]} />
                  )}
                </>
              ) : (
                <SkillIconFancy className={css["skill-icon"]} skill={key} />
              )}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
