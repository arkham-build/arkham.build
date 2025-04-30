import { CardsCombobox } from "@/components/cards-combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { HotkeyTooltip } from "@/components/ui/hotkey";
import { Select, type SelectOption } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useStore } from "@/store";
import {
  type CardFormat,
  type CardFormatDefinition,
  insertCardFormatValueToCardFormatDefinition,
} from "@/store/lib/cards-to-markdown";
import type { ResolvedCard, ResolvedDeck } from "@/store/lib/types";
import { selectListCards } from "@/store/selectors/lists";
import type { Card } from "@/store/services/queries.types";
import type { StoreState } from "@/store/slices";
import type { Id } from "@/store/slices/data.types";
import type { InsertType } from "@/store/slices/notes-editor.types";
import {
  displayAttribute,
  isRandomBasicWeaknessLike,
} from "@/utils/card-utils";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import css from "./notes-editor-toolbar.module.css";
import { NotesTextareaRefContext } from "./notes-textarea-ref-context";
import { SymbolCombobox } from "./symbol-combobox";

type Props = {
  deck: ResolvedDeck;
  deckId: Id;
};

function cardsComboboxSorting(a: ResolvedCard, b: ResolvedCard): number {
  const aName = displayAttribute(a.card, "name");
  const bName = displayAttribute(b.card, "name");
  if (aName !== bName) {
    return aName.localeCompare(bName);
  }
  const aCyclePosition = a.cycle.position;
  const bCyclePosition = b.cycle.position;
  if (aCyclePosition !== bCyclePosition) {
    return aCyclePosition - bCyclePosition;
  }
  const aPosition = a.card.position;
  const bPosition = b.card.position;
  if (aPosition !== bPosition) {
    return aPosition - bPosition;
  }
  return 0;
}

function getDeckCardsForCombobox(deck: ResolvedDeck): Card[] {
  if (deck === undefined) {
    return [];
  }
  const cards: Set<ResolvedCard> = new Set();
  function addToCardsSet(record: Record<string, ResolvedCard>) {
    for (const resolvedCard of Object.values(record)) {
      if (isRandomBasicWeaknessLike(resolvedCard.card)) {
        continue;
      }
      cards.add(resolvedCard);
    }
  }
  addToCardsSet(deck.cards.slots);
  addToCardsSet(deck.cards.sideSlots);
  addToCardsSet(deck.cards.ignoreDeckLimitSlots);
  addToCardsSet(deck.cards.extraSlots);
  addToCardsSet(deck.cards.exileSlots);
  addToCardsSet(deck.cards.bondedSlots);
  const cardsArray = Array.from(cards);
  cardsArray.sort(cardsComboboxSorting);
  return cardsArray.map<Card>((card) => {
    return card.card;
  });
}

const selectUsablePlayerCardsForCombobox = createSelector(
  (state: StoreState, deck: ResolvedDeck) => {
    return selectListCards(state, deck, "both");
  },
  (listState) => {
    if (listState === undefined) {
      return [];
    }
    return listState.cards;
  },
);

const selectAllPlayerCardsForCombobox = createSelector(
  (state: StoreState) => state.metadata,
  (metadata) => {
    const cards: Set<Card> = new Set();
    for (const card of Object.values(metadata.cards)) {
      const playerCard = card.encounter_code === undefined;
      if (playerCard) {
        cards.add(card);
      }
    }
    return Array.from(cards);
  },
);

const selectCampaignCardsForCombobox = createSelector(
  (state: StoreState) => state.metadata,
  (metadata) => {
    const cards: Set<Card> = new Set();
    for (const card of Object.values(metadata.cards)) {
      // Not really all campaign cards, just those that might be useful while writing notes.
      const fromCampaign = card.encounter_code !== undefined;
      const weaknessCard = card.subtype_code === "weakness";
      const treacheryCard = card.type_code === "treachery";
      const enemyCard = card.type_code === "enemy";
      const assetCard = card.type_code === "asset";
      if (
        fromCampaign &&
        (assetCard || weaknessCard || treacheryCard || enemyCard)
      ) {
        cards.add(card);
      }
    }
    return Array.from(cards);
  },
);

type InsertCardFrom = "deck" | "usable" | "all_player_cards" | "campaign_cards";
interface CardFormatDefinitionList {
  name: string;
  value: CardFormat;
  options: CardFormatDefinition;
}

export const cardsComboboxId = "notes-editor-cards-combobox";
export const symbolComboboxId = "notes-editor-symbol-combobox";

export function NotesEditorToolbar(props: Props) {
  const { deck, deckId } = props;
  const { t } = useTranslation();
  const notesTextareaRef = useContext(NotesTextareaRefContext);
  const [insertCardFrom, setInsertCardFrom] = useState<InsertCardFrom>("deck");

  const deckCards: Card[] = getDeckCardsForCombobox(deck);
  const usableCards: Card[] = useStore((state) =>
    selectUsablePlayerCardsForCombobox(state, deck),
  );
  const allPlayerCards: Card[] = useStore((state) =>
    selectAllPlayerCardsForCombobox(state),
  );
  const campaignCards: Card[] = useStore((state) =>
    selectCampaignCardsForCombobox(state),
  );

  let cardsForInsertCardCombobox: Card[];
  switch (insertCardFrom) {
    case "usable":
      cardsForInsertCardCombobox = usableCards;
      break;
    case "deck":
      cardsForInsertCardCombobox = deckCards;
      break;
    case "all_player_cards":
      cardsForInsertCardCombobox = allPlayerCards;
      break;
    case "campaign_cards":
      cardsForInsertCardCombobox = campaignCards;
      break;
  }

  const insertType = useStore((state) => state.notesEditorState.insertType);
  const setInsertType = useStore(
    (state) => state.notesEditorFunctions.setInsertType,
  );
  const insertCardFormat = useStore(
    (state) => state.notesEditorState.insertCardFormat,
  );
  const setCardFormatDefinition = useStore(
    (state) => state.notesEditorFunctions.setCardFormatDefinition,
  );
  const insertPositionStart = useStore(
    (state) => state.notesEditorState.insertPositionStart,
  );
  const metadata = useStore((state) => state.metadata);
  const insertCard = useStore((state) => state.notesEditorFunctions.insertCard);
  const insertString = useStore(
    (state) => state.notesEditorFunctions.insertString,
  );

  const builtInCardFormatDefinitions: CardFormatDefinitionList[] = [
    {
      name: t("deck_edit.notes.toolbar.insert.built_in_format.paragraph"),
      value: "paragraph",
      options: insertCardFormatValueToCardFormatDefinition("paragraph"),
    },
    {
      name: t(
        "deck_edit.notes.toolbar.insert.built_in_format.paragraph_colored",
      ),
      value: "paragraphColored",
      options: insertCardFormatValueToCardFormatDefinition("paragraphColored"),
    },
    {
      name: t("deck_edit.notes.toolbar.insert.built_in_format.header"),
      value: "header",
      options: insertCardFormatValueToCardFormatDefinition("header"),
    },
    {
      name: t("deck_edit.notes.toolbar.insert.built_in_format.header_with_set"),
      value: "headerWithSet",
      options: insertCardFormatValueToCardFormatDefinition("headerWithSet"),
    },
  ];

  const fromSelectOptions: SelectOption[] = [
    {
      label: t("deck_edit.notes.toolbar.insert.from_list.deck"),
      value: "deck",
    },
    {
      label: t("deck_edit.notes.toolbar.insert.from_list.usable"),
      value: "usable",
    },
    {
      label: t("deck_edit.notes.toolbar.insert.from_list.all_player_cards"),
      value: "all_player_cards",
    },
    {
      label: t("deck_edit.notes.toolbar.insert.from_list.campaign_cards"),
      value: "campaign_cards",
    },
  ];
  const formatSelectOptions: SelectOption[] = builtInCardFormatDefinitions.map(
    (option) => ({
      label: option.name,
      value: option.value,
    }),
  );

  return (
    <div className={css["insert-toolbar"]}>
      <Field full bordered>
        <div className={css["insert-field-label"]}>
          <FieldLabel htmlFor="notes-editor-cards-combobox">
            <div>{t("deck_edit.notes.toolbar.insert.insert")}</div>
            <ToggleGroup
              data-testid="notes-insert-type-toggle"
              onValueChange={(value) => {
                if (value !== "") {
                  setInsertType(value as InsertType);
                }
              }}
              type="single"
              value={insertType}
            >
              <HotkeyTooltip
                keybind="ctrl+space"
                description={t(
                  "deck_edit.notes.toolbar.insert.insert_card_tooltip",
                )}
              >
                <ToggleGroupItem value={"card"}>
                  {t("deck_edit.notes.toolbar.insert.card")}
                </ToggleGroupItem>
              </HotkeyTooltip>
              <HotkeyTooltip
                keybind="ctrl+shift+space"
                description={t(
                  "deck_edit.notes.toolbar.insert.insert_symbol_tooltip",
                )}
              >
                <ToggleGroupItem value={"symbol"}>
                  {t("deck_edit.notes.toolbar.insert.symbol")}
                </ToggleGroupItem>
              </HotkeyTooltip>
            </ToggleGroup>
          </FieldLabel>
          {insertType === "card" && (
            <div className={css["insert-card-field-label-right-side"]}>
              <div className={css["insert-card-field-label-right-side-item"]}>
                <FieldLabel htmlFor="notes-editor-from-select">
                  {t("deck_edit.notes.toolbar.insert.from")}
                </FieldLabel>
                <Select
                  data-side="front"
                  data-testid="notes-editor-from-select"
                  id="notes-editor-from-select"
                  variant="compressed"
                  onChange={(evt) => {
                    setInsertCardFrom(
                      evt.currentTarget.value as InsertCardFrom,
                    );
                  }}
                  options={fromSelectOptions}
                  required
                  value={insertCardFrom}
                />
              </div>
              <div className={css["insert-card-field-label-right-side-item"]}>
                <FieldLabel htmlFor="notes-editor-format-select">
                  {t("deck_edit.notes.toolbar.insert.format")}
                </FieldLabel>
                <Select
                  data-side="front"
                  data-testid="notes-editor-format-select"
                  id="notes-editor-format-select"
                  variant="compressed"
                  onChange={(evt) => {
                    setCardFormatDefinition(
                      evt.currentTarget.value as CardFormat,
                    );
                  }}
                  options={formatSelectOptions}
                  required
                  value={insertCardFormat}
                />
              </div>
            </div>
          )}
        </div>
        {insertType === "symbol" && (
          <SymbolCombobox
            id={symbolComboboxId}
            limit={1}
            onEscapeBlur={() => notesTextareaRef.current?.focus()}
            onSymbolSelected={(symbol) => {
              const insertResult = insertString(
                deckId,
                `<span class=\"${symbol.spanClass}\"></span>`,
              );
              if (notesTextareaRef.current !== null) {
                setTimeout(() => {
                  notesTextareaRef.current?.setSelectionRange(
                    insertResult.newCaretPosition ?? null,
                    insertResult.newCaretPosition ?? null,
                  );
                }, 0);
              }
            }}
          />
        )}
        {insertType === "card" && (
          <CardsCombobox
            id={cardsComboboxId}
            label={""}
            limit={1}
            items={cardsForInsertCardCombobox}
            disabled={insertPositionStart === undefined}
            onEscapeBlur={() => {
              notesTextareaRef.current?.focus();
            }}
            onValueChange={(value) => {
              if (value.length === 0) {
                return;
              }
              const selectedCardCode = value[0];
              const selectedCard = metadata.cards[selectedCardCode];
              const insertResult = insertCard(deckId, selectedCard);
              if (notesTextareaRef.current !== null) {
                setTimeout(() => {
                  notesTextareaRef.current?.setSelectionRange(
                    insertResult.newCaretPosition ?? null,
                    insertResult.newCaretPosition ?? null,
                  );
                }, 0);
              }
            }}
            selectedItems={[]}
          />
        )}
      </Field>
    </div>
  );
}
