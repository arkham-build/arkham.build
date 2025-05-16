import { useStore } from "@/store";
import { selectBackCard } from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import {
  cardBackType,
  cardBackTypeUrl,
  imageUrl,
  sideways,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { useAgathaEasterEggTransform } from "@/utils/easter-egg-agatha";
import { RotateCcwIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import css from "./card-scan.module.css";
import { Button } from "./ui/button";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  card: Card;
  className?: string;
  lazy?: boolean;
  preventFlip?: boolean;
  onFlip?: (sideways: boolean) => void;
  suffix?: string;
}

export function CardScan(props: Props) {
  const { preventFlip, onFlip, card, lazy, suffix, ...rest } = props;
  const { t } = useTranslation();
  const scanRef = useRef<HTMLDivElement>(null);

  const backCard = useStore((state) => selectBackCard(state, card.code));
  const backType = backCard ? "card" : cardBackType(card);

  const [flipped, setFlipped] = useState(false);

  const code = card.code;

  const backCode =
    backType === "card"
      ? (backCard?.code ?? (suffix ? code : `${code}b`))
      : backType;

  const tabooSetId =
    card.taboo_set_id && card.taboo_set_id <= 8 ? card.taboo_set_id : undefined;

  const imageCode = useAgathaEasterEggTransform(
    tabooSetId
      ? `${code}${suffix ?? ""}-${tabooSetId}`
      : `${code}${suffix ?? ""}`,
  );

  const reverseImageCode = useAgathaEasterEggTransform(
    tabooSetId ? `${backCode}-${tabooSetId}` : backCode,
  );

  const isSideways = sideways(card);

  const reverseSideways = backCard
    ? sideways(backCard)
    : backType === "card"
      ? isSideways
      : false;

  // Fan-made content uses card urls for sides, these take precedence.
  const frontUrl = suffix === "b" ? card.back_image_url : card.image_url;
  const backUrl = backCard
    ? backCard.image_url
    : suffix === "b"
      ? card.image_url
      : card.back_image_url;

  const onToggleFlip = useCallback(
    (evt: React.MouseEvent) => {
      evt.preventDefault();
      evt.stopPropagation();

      const next = !flipped;
      if (onFlip) onFlip(next ? reverseSideways : isSideways);
      setFlipped(next);
    },
    [flipped, isSideways, reverseSideways, onFlip],
  );

  return (
    <div
      {...rest}
      className={cx(
        css["scan-container"],
        flipped && css["flipped"],
        flipped
          ? reverseSideways && css["sideways"]
          : isSideways && css["sideways"],
      )}
      data-testid="card-scan"
      data-component="card-scan"
    >
      <div className={css["scan-front"]} data-testid="card-scan" ref={scanRef}>
        <CardScanInner
          alt={t("card_view.scan", { code: imageCode })}
          lazy={lazy}
          sideways={isSideways}
          url={frontUrl ? frontUrl : imageUrl(imageCode)}
        />
      </div>
      {!preventFlip && (
        <>
          <div className={css["scan-back"]} ref={scanRef}>
            {backType === "card" ? (
              <CardScanInner
                alt={t("card_view.scan", { code: reverseImageCode })}
                hidden={!flipped}
                lazy={lazy}
                sideways={backCard ? sideways(backCard) : isSideways}
                url={backUrl ? backUrl : imageUrl(reverseImageCode)}
              />
            ) : (
              <CardScanInner
                alt={t("card_view.scan", { code: backType })}
                hidden={!flipped}
                lazy={lazy}
                sideways={false}
                url={backUrl || cardBackTypeUrl(backType)}
              />
            )}
          </div>
          <Button
            className={css["scan-flip-trigger"]}
            onClick={onToggleFlip}
            iconOnly
            round
          >
            <RotateCcwIcon />
          </Button>
        </>
      )}
    </div>
  );
}

export function CardScanInner(
  props: Omit<Props, "card"> & {
    alt: string;
    url: string;
    initialHidden?: boolean;
    crossOrigin?: "anonymous";
    sideways?: boolean;
  },
) {
  const { alt, crossOrigin, hidden, sideways, lazy, className, url, ...rest } =
    props;

  const [shown, setShown] = useState(!hidden);

  useEffect(() => {
    if (!hidden) setShown(true);
  }, [hidden]);

  return (
    <div
      {...rest}
      className={cx(css["scan"], sideways && css["sideways"], className)}
      data-component="card-scan"
    >
      {shown && (
        <img
          alt={alt}
          crossOrigin={crossOrigin}
          height={sideways ? 300 : 420}
          loading={lazy ? "lazy" : undefined}
          src={url}
          width={sideways ? 420 : 300}
        />
      )}
    </div>
  );
}
