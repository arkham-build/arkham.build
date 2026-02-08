import type { Card } from "@arkham-build/shared";
import { cardLevel, getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./card-icon.module.css";
import { CostIcon } from "./icons/cost-icon";
import EncounterIcon from "./icons/encounter-icon";
import { FactionIcon } from "./icons/faction-icon";
import { LevelIcon } from "./icons/level-icon";

type Props = {
  card: Card;
  className?: string;
  inverted?: boolean;
};

export function CardIcon(props: Props) {
  const { card, className, inverted } = props;

  if (card.subtype_code && card.type_code === "treachery") {
    return (
      <span
        className={cx(
          css["icon_weakness"],
          className,
          inverted && css["icon_inverted"],
        )}
      >
        <i className="icon-weakness" />
      </span>
    );
  }

  if (card.faction_code === "mythos") {
    return (
      <div
        className={cx(
          css["icon_mythos"],
          className,
          inverted && css["icon_inverted"],
        )}
      >
        <EncounterIcon code={card.encounter_code} invert />
      </div>
    );
  }

  if (card.type_code === "investigator") {
    return (
      <div
        className={cx(
          css["icon_large"],
          className,
          inverted && css["icon_inverted"],
        )}
      >
        <FactionIcon code={card.faction_code} />
      </div>
    );
  }

  const level = cardLevel(card);

  if (card.type_code === "skill") {
    return (
      <div
        className={cx(
          css["icon_skill"],
          className,
          inverted && css["icon_inverted"],
        )}
      >
        <FactionIcon className={css["icon-child"]} code={card.faction_code} />
        <LevelIcon
          className={css["icon-level"]}
          inverted={inverted}
          level={level}
        />
      </div>
    );
  }

  const colorCls = getCardColor(card);

  return (
    <div
      className={cx(
        css["icon_cost"],
        colorCls,
        className,
        inverted && css["icon_inverted"],
      )}
    >
      {card.cost && card.cost >= 10 ? (
        <span className={cx(css["icon-children"])}>
          <CostIcon cost={card.cost.toString().split("")[0]} />
          <CostIcon cost={card.cost.toString().split("")[1]} />
        </span>
      ) : (
        <CostIcon className={css["icon-child"]} cost={card.cost} />
      )}
      <LevelIcon
        className={css["icon-level"]}
        inverted={inverted}
        level={level}
      />
    </div>
  );
}
