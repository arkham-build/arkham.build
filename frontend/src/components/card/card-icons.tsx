import type { Card } from "@/store/schemas/card.schema";
import { isEnemyLike } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { range } from "@/utils/range";
import { CardHealth } from "../card-health";
import { HealthIcon, SanityIcon } from "../icons/health-icons";
import { SkillIcons } from "../skill-icons/skill-icons";
import { SkillIconsEnemy } from "../skill-icons/skill-icons-enemy";
import { SkillIconsInvestigator } from "../skill-icons/skill-icons-investigator";
import css from "./card.module.css";

type Props = {
  card: Card;
  className?: string;
};

export function CardIcons(props: Props) {
  const { card, className } = props;

  return (
    <div className={cx(css["icons"], className)}>
      {card.type_code === "investigator" ? (
        <SkillIconsInvestigator
          card={card}
          className={css["icons-skills"]}
          iconClassName={css["icons-skill"]}
        />
      ) : (
        <SkillIcons
          card={card}
          className={css["icons-skills"]}
          fancy
          iconClassName={css["icons-skill"]}
        />
      )}

      {!isEnemyLike(card) && (card.health || card.sanity) && (
        <CardHealth health={card.health} sanity={card.sanity} />
      )}

      {isEnemyLike(card) && (
        <>
          <SkillIconsEnemy
            card={card}
            className={css["icons-skills"]}
            iconClassName={css["icons-skill"]}
          />
          <div className={css["icons-damage"]}>
            {!!card.enemy_damage &&
              range(0, card.enemy_damage).map((i) => (
                <HealthIcon key={i} hideCost />
              ))}
            {!!card.enemy_horror &&
              range(0, card.enemy_horror).map((i) => (
                <SanityIcon key={i} hideCost />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
