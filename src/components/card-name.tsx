import { useStore } from "@/store";
import type { Card } from "@/store/services/queries.types";
import {
  cardLevel,
  cycleOrPack,
  displayAttribute,
  parseCardTextHtml,
} from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import css from "./card-name.module.css";
import { ExperienceDots } from "./experience-dots";
import PackIcon from "./icons/pack-icon";

interface Props {
  card: Card;
  children?: React.ReactNode;
  cardLevelDisplay: "icon-only" | "dots" | "text";
  cardShowCollectionNumber?: boolean;
}

export function CardName(props: Props) {
  const { card, cardLevelDisplay, cardShowCollectionNumber, children } = props;
  const level = cardLevel(card);

  return (
    <span className={css["name"]}>
      {children}
      <span
        // biome-ignore lint/security/noDangerouslySetInnerHtml: safe.
        dangerouslySetInnerHTML={{
          __html: parseCardTextHtml(displayAttribute(card, "name"), {
            bullets: false,
          }),
        }}
      />
      {!!level && cardLevelDisplay === "dots" && <ExperienceDots xp={level} />}
      {level != null && cardLevelDisplay === "text" && (
        <span className={css["xp"]}>({level})</span>
      )}
      {cardShowCollectionNumber &&
        card.code !== SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS && (
          <CardPackDetail card={card} />
        )}
    </span>
  );
}

function CardPackDetail(props: { card: Card }) {
  const { card } = props;

  const pack = useStore((state) => state.metadata.packs[card.pack_code]);
  const cycle = useStore((state) => state.metadata.cycles[pack.cycle_code]);
  const displayPack = cycleOrPack(cycle, pack);

  return (
    <span className={css["pack-detail"]}>
      (<PackIcon className={css["pack-detail-icon"]} code={displayPack.code} />{" "}
      <span className={css["pack-detail-position"]}>{card.position}</span>)
    </span>
  );
}
