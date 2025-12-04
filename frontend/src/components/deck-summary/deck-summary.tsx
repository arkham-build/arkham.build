import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CircleAlertIcon,
  CopyIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useStore } from "@/store";
import type { DeckValidationResult } from "@/store/lib/deck-validation";
import { deckTags } from "@/store/lib/resolve-deck";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Id } from "@/store/schemas/deck.schema";
import { selectConnectionLockForDeck } from "@/store/selectors/shared";
import { displayAttribute, getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { CardThumbnail } from "../card-thumbnail";
import { useChangeArchiveStatus } from "../deck-display/hooks";
import { DeckStats } from "../deck-stats";
import {
  DeckTags,
  DeckTagsContainer,
  LimitedCardPoolTag,
  ProviderTag,
  SealedDeckTag,
} from "../deck-tags/deck-tags";
import { FolderTag } from "../folders/folder-tag";
import { Button } from "../ui/button";
import { CopyToClipboard } from "../ui/copy-to-clipboard";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./deck-summary.module.css";

type DeckSummaryProps = {
  children?: React.ReactNode;
  deck: ResolvedDeck;
  elevation?: "normal" | "elevated";
  interactive?: boolean;
  showThumbnail?: boolean;
  showShadow?: boolean;
  size?: "sm";
  variant?: "base" | "interactive" | "interactive-bright";
  type?: "deck" | "decklist";
  validation?: DeckValidationResult | string | null;
} & React.ComponentProps<"article">;

export function DeckSummary(props: DeckSummaryProps) {
  const {
    children,
    deck,
    elevation,
    interactive,
    showShadow,
    showThumbnail,
    size,
    type = "deck",
    validation,
    ...rest
  } = props;

  const { t } = useTranslation();

  const backgroundCls = getCardColor(deck.investigatorBack.card, "background");
  const borderCls = getCardColor(deck.investigatorBack.card, "border");

  const card = {
    ...deck.investigatorFront.card,
    parallel:
      deck.investigatorFront.card.parallel ||
      deck.investigatorBack.card.parallel,
  };

  return (
    <article
      {...rest}
      className={cx(
        css["summary"],
        borderCls,
        interactive && css["interactive"],
        showShadow && css["shadow"],
        size && css[size],
        elevation === "elevated" && css["elevated"],
        rest.className,
      )}
    >
      <Link href={`/${type}/view/${deck.id}`}>
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
                    <DefaultTooltip tooltip={t("deck.stats.uses_parallel")}>
                      <i className="icon-parallel" />
                    </DefaultTooltip>
                  )}
                  <h4
                    className={css["sub"]}
                    data-testid="deck-summary-investigator"
                  >
                    {displayAttribute(card, "name")}
                  </h4>
                </div>
                <DeckStats deck={deck} />
              </div>
            </div>
          </div>
        </header>
      </Link>
      <div className={css["meta"]}>
        {children}
        <DeckTagsContainer>
          <ProviderTag deck={deck} />
          <FolderTag deckId={deck.id} />
          <LimitedCardPoolTag deck={deck} omitLegacy />
          <SealedDeckTag deck={deck} />
          <DeckTags tags={deckTags(deck, type === "decklist" ? ", " : " ")} />
        </DeckTagsContainer>
      </div>
    </article>
  );
}

type DeckSummaryQuickActionsProps = {
  deck: ResolvedDeck;
  onDeleteDeck?: (id: Id) => Promise<void>;
  onDuplicateDeck?: (id: Id) => void;
};

export function DeckSummaryQuickActions(props: DeckSummaryQuickActionsProps) {
  const { deck, onDeleteDeck, onDuplicateDeck } = props;

  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const connectionLock = useStore((state) =>
    selectConnectionLockForDeck(state, deck),
  );

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

  const { isArchived, toggleArchived } = useChangeArchiveStatus(deck.id);

  const onArchive = useCallback(
    (evt: React.MouseEvent) => {
      cancelEvent(evt);
      toggleArchived();
    },
    [toggleArchived],
  );

  return (
    <nav className={css["quick-actions"]}>
      <Button
        className={css["quick-action"]}
        iconOnly
        tooltip={t("deck.actions.edit")}
        onClick={onEdit}
      >
        <PencilIcon />
      </Button>
      <Button
        className={css["quick-action"]}
        iconOnly
        tooltip={t("deck.actions.upgrade")}
        onClick={onUpgrade}
      >
        <i className="icon-xp-bold" />
      </Button>
      <Button
        className={css["quick-action"]}
        iconOnly
        onClick={onArchive}
        tooltip={
          isArchived ? t("deck.actions.unarchive") : t("deck.actions.archive")
        }
      >
        {isArchived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
      </Button>
      <Button
        className={css["quick-action"]}
        iconOnly
        tooltip={t("deck.actions.duplicate")}
        onClick={onDuplicate}
      >
        <CopyIcon />
      </Button>
      <CopyToClipboard
        className={css["quick-action"]}
        text={deck.id.toString()}
        tooltip={t("deck.actions.copy_id")}
      />
      <Button
        className={css["quick-action"]}
        iconOnly
        disabled={!!connectionLock}
        onClick={onDelete}
        tooltip={connectionLock ? connectionLock : t("deck.actions.delete")}
      >
        <Trash2Icon />
      </Button>
    </nav>
  );
}

function cancelEvent(evt: React.MouseEvent) {
  evt.preventDefault();
  evt.stopPropagation();
}
