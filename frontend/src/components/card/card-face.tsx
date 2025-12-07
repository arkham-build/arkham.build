import { ImageIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CardWithRelations, ResolvedCard } from "@/store/lib/types";
import type { Card } from "@/store/schemas/card.schema";
import { displayAttribute, sideways } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { CardScan } from "../card-scan";
import { CardThumbnail } from "../card-thumbnail";
import { Button } from "../ui/button";
import css from "./card.module.css";
import { CardDetails } from "./card-details";
import { CardHeader } from "./card-header";
import { CardIcons } from "./card-icons";
import { CardMeta } from "./card-meta";
import { CardTabooText } from "./card-taboo-text";
import { CardText } from "./card-text";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  ignoreTaboo?: boolean;
  onPrintingSelect?: (card: Card) => void;
  resolvedCard: CardWithRelations | ResolvedCard;
  setIgnoreTaboo?: React.Dispatch<React.SetStateAction<boolean>>;
  size: "compact" | "tooltip" | "full";
  slotHeaderActions?: React.ReactNode;
  titleLinks?: "card" | "card-modal" | "dialog";
}

export function CardFace(props: Props) {
  const {
    children,
    className,
    ignoreTaboo,
    onPrintingSelect,
    resolvedCard,
    setIgnoreTaboo,
    size,
    slotHeaderActions,
    titleLinks,
    ...rest
  } = props;

  const { t } = useTranslation();

  const { card } = resolvedCard;
  const [isSideways, setSideways] = useState(sideways(card));

  const showImage = size === "full" || card.type_code !== "story";

  const onFlip = useCallback((_: boolean, sideways: boolean) => {
    setSideways(sideways);
  }, []);

  return (
    <article
      className={cx(
        css["card"],
        isSideways && css["sideways"],
        showImage && css["has-image"],
        css[size],
        className,
      )}
      data-testid="card-face"
      {...rest}
    >
      <CardHeader
        card={card}
        slotHeaderActions={slotHeaderActions}
        titleLinks={titleLinks}
      />

      <div className={css["pre"]}>
        <CardDetails card={card} />
        <CardIcons card={card} />
      </div>

      <div className={css["content"]}>
        <CardText
          flavor={displayAttribute(card, "flavor")}
          size={size}
          text={displayAttribute(card, "text")}
          typeCode={card.type_code}
          victory={card.victory}
        />
        <CardTabooText card={card} showOriginalText={size !== "tooltip"}>
          {!!card.taboo_set_id && !!setIgnoreTaboo && (
            <Button onClick={() => setIgnoreTaboo((p) => !p)} size="xs">
              <ImageIcon />
              {ignoreTaboo
                ? t("card_view.actions.show_taboo_image")
                : t("card_view.actions.show_original_image")}
            </Button>
          )}
        </CardTabooText>
        <CardMeta
          onPrintingSelect={onPrintingSelect}
          resolvedCard={resolvedCard}
          size={size}
        />
        {children}
      </div>

      {showImage &&
        (size === "full" ? (
          <div className={css["image"]}>
            <CardScan card={card} onFlip={onFlip} ignoreTaboo={ignoreTaboo} />
          </div>
        ) : (
          <div className={css["image"]}>
            <CardThumbnail card={card} />
          </div>
        ))}
    </article>
  );
}
