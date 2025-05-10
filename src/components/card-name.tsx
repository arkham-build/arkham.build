import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import {
  cardLevel,
  cycleOrPack,
  displayAttribute,
  parseCardTextHtml,
} from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { cx } from "@/utils/cx";
import css from "./card-name.module.css";
import { ExperienceDots } from "./experience-dots";
import PackIcon from "./icons/pack-icon";

interface Props {
  card: Card;
  children?: React.ReactNode;
  cardLevelDisplay: "icon-only" | "dots" | "text";
  cardShowCollectionNumber?: boolean;
  className?: string;
}

export function CardName(props: Props) {
  const {
    card,
    cardLevelDisplay,
    cardShowCollectionNumber,
    children,
    className,
  } = props;
  const level = cardLevel(card);

  return (
    <div className={cx(css["name"], className)} data-testid="card-name-inner">
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
    </div>
  );
}

function CardPackDetail(props: { card: Card }) {
  const { card } = props;

  const metadata = useStore(selectMetadata);

  const pack = metadata.packs[card.pack_code];
  const cycle = metadata.cycles[pack.cycle_code];
  const displayPack = cycleOrPack(cycle, pack);

  return (
    <span className={css["pack-detail"]}>
      (<PackIcon className={css["pack-detail-icon"]} code={displayPack.code} />{" "}
      <span className={css["pack-detail-position"]}>{card.position}</span>)
    </span>
  );
}
