import { CardsCombobox } from "@/components/cards-combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  CARD_FORMATS,
  type CardFormat,
  cardFormatDefinition,
  cardToMarkdown,
} from "@/pages/deck-edit/editor/notes-rte/cards-to-markdown";
import { useStore } from "@/store";
import { filterEncounterCards } from "@/store/lib/filtering";
import { makeSortFunction } from "@/store/lib/sorting";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectListCards } from "@/store/selectors/lists";
import { selectLocaleSortingCollator } from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import type { StoreState } from "@/store/slices";
import { and, not } from "@/utils/fp";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  type CardOrigin,
  useNotesRichTextEditorContext,
} from "./notes-rte-context";
import css from "./notes-rte.module.css";

const emptySelection: string[] = [];

type Props = {
  deck: ResolvedDeck;
  onEscapePress: () => void;
};

export function CardsPopover(props: Props) {
  const { deck, onEscapePress } = props;
  const { t } = useTranslation();

  const {
    cardFormat,
    cardOrigin,
    insertTextAtCaret,
    setCardFormat,
    setCardOrigin,
  } = useNotesRichTextEditorContext();

  const state = useStore();

  const cards = useMemo(
    () => selectCardOptions(state, cardOrigin, deck),
    [state, cardOrigin, deck],
  );

  const formatOptions = useMemo(
    () =>
      Object.keys(CARD_FORMATS).map((id) => ({
        label: t(`deck_edit.notes.toolbar.formats.${id}`),
        value: id,
      })),
    [t],
  );

  const originOptions = useMemo(
    () =>
      ["deck", "usable", "player", "campaign"].map((id) => ({
        label: t(`deck_edit.notes.toolbar.origins.${id}`),
        value: id,
      })),
    [t],
  );

  const onSelectItem = useCallback(
    (item: string[]) => {
      const card = state.metadata.cards[item[0]];
      if (!card) return;
      insertTextAtCaret(
        cardToMarkdown(
          card,
          state.metadata,
          state.lookupTables,
          cardFormatDefinition(cardFormat),
        ),
      );
    },
    [insertTextAtCaret, state.metadata, state.lookupTables, cardFormat],
  );

  return (
    <div className={css["cards-popover"]}>
      <Field className={css["cards-format"]}>
        <FieldLabel htmlFor="notes-rte-format">
          {t("deck_edit.notes.toolbar.format")}
        </FieldLabel>
        <Select
          data-testid="notes-rte-format"
          id="notes-rte-format"
          variant="compressed"
          onChange={(evt) => {
            setCardFormat(evt.currentTarget.value as CardFormat);
          }}
          options={formatOptions}
          required
          value={cardFormat}
        />
      </Field>
      <Field className={css["cards-origin"]}>
        <FieldLabel htmlFor="notes-rte-origin">
          {t("deck_edit.notes.toolbar.origin")}
        </FieldLabel>
        <Select
          data-testid="notes-rte-origin"
          id="notes-rte-origin"
          variant="compressed"
          onChange={(evt) => {
            setCardOrigin(evt.currentTarget.value as CardOrigin);
          }}
          options={originOptions}
          required
          value={cardOrigin}
        />
      </Field>
      <Field className={css["cards-combobox"]}>
        <FieldLabel>{t("deck_edit.notes.toolbar.card")}</FieldLabel>
        <CardsCombobox
          autoFocus
          defaultOpen
          id="insert-card-combobox"
          items={cards}
          label={t("deck_edit.notes.toolbar.card")}
          limit={1}
          omitFloatingPortal
          onEscapeBlur={onEscapePress}
          selectedItems={emptySelection}
          onValueChange={onSelectItem}
        />
      </Field>
    </div>
  );
}

function selectCardOptions(
  state: StoreState,
  origin: CardOrigin,
  deck: ResolvedDeck,
) {
  const metadata = state.metadata;
  const collator = selectLocaleSortingCollator(state);

  const sortFn = makeSortFunction(
    ["name", "level", "position"],
    metadata,
    collator,
  );

  const cards: Card[] = [];

  if (origin === "usable") {
    const listCards = selectListCards(state, deck, "both");

    cards.push(...(listCards?.cards ?? []));
  } else if (origin === "player") {
    const filterFn = not(filterEncounterCards);

    cards.push(...Object.values(metadata.cards).filter(filterFn));
  } else if (origin === "campaign") {
    const filterRelevantEncounterCards = (card: Card) =>
      !!card.subtype_code || // weaknesses
      !!card.deck_limit || // story assets
      card.faction_code === "neutral" ||
      ["asset", "enemy", "treachery"].includes(card.type_code);

    const filterFn = and([filterEncounterCards, filterRelevantEncounterCards]);

    cards.push(...Object.values(metadata.cards).filter(filterFn));
  } else {
    const deckSlots = {
      ...deck.slots,
      ...deck.sideSlots,
      ...deck.exileSlots,
      ...deck.extraSlots,
      ...deck.bondedSlots,
    };

    const filterFn = (card: Card) => deckSlots[card.code] != null;
    cards.push(...Object.values(metadata.cards).filter(filterFn));
  }

  return cards.sort(sortFn);
}
