import { type Card, cardLevel, SPECIAL_CARD_CODES } from "@arkham-build/shared";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import {
  cycleOrPack,
  displayAttribute,
  parseCardTextHtml,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./card-name.module.css";
import { ExperienceDots } from "./experience-dots";
import PackIcon from "./icons/pack-icon";

interface Props {
  card: Card;
  children?: React.ReactNode;
  cardLevelDisplay: "icon-only" | "dots" | "text";
  cardShowCollectionNumber?: boolean;
  cardShowUniqueIcon?: boolean;
  className?: string;
  invert?: boolean;
  slotAfter?: React.ReactNode;
}

export function CardName(props: Props) {
  const {
    card,
    cardLevelDisplay,
    cardShowCollectionNumber,
    cardShowUniqueIcon,
    children,
    className,
    invert,
    slotAfter,
  } = props;
  const level = cardLevel(card);

  return (
    <div className={cx(css["name"], className)} data-testid="card-name-inner">
      {cardShowUniqueIcon && !!card.is_unique && (
        <i className={cx(css["unique"], "icon-unique")} />
      )}
      {children}
      <span
        // oxlint-disable-next-line react/no-danger -- safe.
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
          <CardPackDetail card={card} invert={invert} />
        )}
      {slotAfter}
    </div>
  );
}

function CardPackDetail(props: { card: Card; invert?: boolean }) {
  const { card, invert } = props;

  const metadata = useStore(selectMetadata);

  const pack = metadata.packs[card.pack_code];
  const cycle = metadata.cycles[pack.cycle_code];
  const displayPack = cycleOrPack(cycle, pack);

  return (
    <span className={cx(css["pack-detail"], invert && css["invert"])}>
      <PackIcon
        className={css["pack-detail-icon"]}
        code={displayPack.code}
        invert={invert}
      />{" "}
      <span className={css["pack-detail-position"]}>{card.position}</span>
    </span>
  );
}
