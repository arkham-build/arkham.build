import type { CardWithRelations, ResolvedCard } from "@/store/lib/types";
import { isCardWithRelations } from "@/store/lib/types";
import { cycleOrPack } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { displayPackName } from "@/utils/formatting";
import EncounterIcon from "../icons/encounter-icon";
import PackIcon from "../icons/pack-icon";
import css from "./card.module.css";

type Props = {
  resolvedCard: ResolvedCard | CardWithRelations;
  size: "tooltip" | "compact" | "full";
};

export function CardMetaBack(props: { illustrator?: string }) {
  if (!props.illustrator) return null;

  return (
    <footer className={css["meta"]}>
      <p className={css["meta-property"]}>
        <i className="icon-paintbrush" /> {props.illustrator}
      </p>
    </footer>
  );
}

export function CardMeta(props: Props) {
  const { resolvedCard, size } = props;

  const illustrator = resolvedCard.card.illustrator;

  const { card } = resolvedCard;

  return (
    <footer className={cx(css["meta"], css[size])}>
      {size === "full" && illustrator && (
        <p className={css["meta-property"]}>
          <i className="icon-paintbrush" /> {illustrator}
        </p>
      )}
      {card.encounter_code ? (
        <EncounterEntry resolvedCard={resolvedCard} size={size} />
      ) : (
        <PlayerEntry resolvedCard={resolvedCard} size={size} />
      )}
    </footer>
  );
}

function PlayerEntry(props: Props) {
  const { resolvedCard, size } = props;
  const { card, cycle, pack } = resolvedCard;

  const duplicates = isCardWithRelations(resolvedCard)
    ? resolvedCard.relations?.duplicates
    : [];

  const displayPack = cycleOrPack(cycle, pack);

  return (
    <>
      {size === "full" &&
        duplicates?.map((duplicate) => (
          <p className={css["meta-property"]} key={duplicate.card.code}>
            {displayPackName(duplicate.pack)}{" "}
            <PackIcon code={duplicate.pack.code} /> {duplicate.card.position}{" "}
            <i className="icon-card-outline-bold" /> ×{duplicate.card.quantity}
          </p>
        ))}
      <p className={css["meta-property"]}>
        {displayPackName(displayPack)} <PackIcon code={displayPack.code} />{" "}
        {card.position} <i className="icon-card-outline-bold" /> ×
        {card.quantity}
      </p>
    </>
  );
}

function EncounterEntry(props: Props) {
  const { card, cycle, encounterSet, pack } = props.resolvedCard;
  if (!encounterSet) return null;

  const displayPack = cycleOrPack(cycle, pack);

  return (
    <>
      <p className={css["meta-property"]}>
        {encounterSet.name} <EncounterIcon code={card.encounter_code} />{" "}
        {getEncounterPositions(card.encounter_position ?? 1, card.quantity)}
      </p>
      <p className={css["meta-property"]}>
        {displayPackName(displayPack)} <PackIcon code={displayPack.code} />{" "}
        {card.position}
      </p>
    </>
  );
}

function getEncounterPositions(position: number, quantity: number) {
  if (quantity === 1) return position;
  const start = position;
  const end = position + quantity - 1;
  return `${start}-${end}`;
}
