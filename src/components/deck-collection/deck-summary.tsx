import { useStore } from "@/store";
import type { DeckValidationResult } from "@/store/lib/deck-validation";
import { extendedDeckTags } from "@/store/lib/resolve-deck";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectConnectionLockForDeck } from "@/store/selectors/shared";
import type { Id } from "@/store/slices/data.types";
import { getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import {
  CircleAlertIcon,
  CopyIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { CardThumbnail } from "../card-thumbnail";
import { DeckStats } from "../deck-stats";
import { DeckTags } from "../deck-tags";
import { Button } from "../ui/button";
import { CopyToClipboard } from "../ui/copy-to-clipboard";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./deck-summary.module.css";

type Props = {
  deck: ResolvedDeck;
  onDeleteDeck?: (id: Id) => Promise<void>;
  onDuplicateDeck?: (id: Id) => void;
  interactive?: boolean;
  showThumbnail?: boolean;
  validation?: DeckValidationResult | string | null;
};

export function DeckSummary(props: Props) {
  const {
    deck,
    interactive,
    onDeleteDeck,
    onDuplicateDeck,
    showThumbnail,
    validation,
  } = props;

  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const backgroundCls = getCardColor(deck.investigatorBack.card, "background");
  const borderCls = getCardColor(deck.investigatorBack.card, "border");

  const connectionLock = useStore((state) =>
    selectConnectionLockForDeck(state, deck),
  );

  const card = {
    ...deck.investigatorFront.card,
    parallel:
      deck.investigatorFront.card.parallel ||
      deck.investigatorBack.card.parallel,
  };

  const onDuplicate = useCallback(
    (evt: React.MouseEvent) => {
      cancelEvent(evt);
      onDuplicateDeck?.(deck.id);
    },
    [deck.id, onDuplicateDeck],
  );

  const onDelete = useCallback(
    (evt: React.MouseEvent) => {
      cancelEvent(evt);
      onDeleteDeck?.(deck.id);
    },
    [deck.id, onDeleteDeck],
  );

  const onEdit = useCallback(
    (evt: React.MouseEvent) => {
      cancelEvent(evt);
      navigate(`/deck/edit/${deck.id}`);
    },
    [deck.id, navigate],
  );

  const onUpgrade = useCallback(
    (evt: React.MouseEvent) => {
      cancelEvent(evt);
      navigate(`/deck/view/${deck.id}?upgrade`);
    },
    [deck.id, navigate],
  );

  const tags = useMemo(() => extendedDeckTags(deck, true), [deck]);

  return (
    <article
      className={cx(
        css["summary"],
        borderCls,
        interactive && css["interactive"],
      )}
    >
      <Link href={`/deck/view/${deck.id}`}>
        <header className={cx(css["header"], backgroundCls)}>
          {showThumbnail && (
            <div className={css["thumbnail"]}>
              <CardThumbnail card={card} />
              {!!validation &&
                (typeof validation === "string" || !validation?.valid) && (
                  <div className={css["validation"]}>
                    <CircleAlertIcon />
                  </div>
                )}
            </div>
          )}
          <div className={css["header-container"]}>
            <div className={cx(css["info-container"])}>
              <h3 className={css["title"]} data-testid="deck-summary-title">
                {deck.name}
              </h3>
              <div className={cx(css["header-row"], css["wrap"])}>
                <div className={css["header-row"]}>
                  {card.parallel && (
                    <DefaultTooltip tooltip="Uses a parallel side">
                      <i className="icon-parallel" />
                    </DefaultTooltip>
                  )}
                  <h4
                    className={css["sub"]}
                    data-testid="deck-summary-investigator"
                  >
                    {card.real_name}
                  </h4>
                </div>
                <DeckStats deck={deck} />
              </div>
            </div>
          </div>
        </header>
      </Link>
      <div className={css["meta"]}>
        <DeckTags tags={tags} />
        <nav className={css["quick-actions"]}>
          <Button
            className={css["quick-action"]}
            iconOnly
            tooltip={t("common.deck_actions.edit")}
            onClick={onEdit}
          >
            <PencilIcon />
          </Button>
          <Button
            className={css["quick-action"]}
            iconOnly
            tooltip={t("common.deck_actions.upgrade")}
            onClick={onUpgrade}
          >
            <i className="icon-xp-bold" />
          </Button>
          <Button
            className={css["quick-action"]}
            iconOnly
            tooltip={t("common.deck_actions.duplicate")}
            onClick={onDuplicate}
          >
            <CopyIcon />
          </Button>
          <CopyToClipboard
            className={css["quick-action"]}
            text={deck.id.toString()}
            tooltip={t("common.deck_actions.copy_id")}
          />
          <Button
            className={css["quick-action"]}
            iconOnly
            disabled={!!connectionLock}
            onClick={onDelete}
            tooltip={
              connectionLock ? connectionLock : t("common.deck_actions.delete")
            }
          >
            <Trash2Icon />
          </Button>
        </nav>
      </div>
    </article>
  );
}

function cancelEvent(evt: React.MouseEvent) {
  evt.preventDefault();
  evt.stopPropagation();
}
