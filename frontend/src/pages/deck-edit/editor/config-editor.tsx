import type { TFunction } from "i18next";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { CardPoolExtensionFields } from "@/components/limited-card-pool/card-pool-extension";
import { LimitedCardPoolField } from "@/components/limited-card-pool/limited-card-pool-field";
import { SealedDeckField } from "@/components/limited-card-pool/sealed-deck-field";
import { TabooSelect } from "@/components/taboo-select";
import { Field, FieldLabel } from "@/components/ui/field";
import type { SelectOption } from "@/components/ui/select";
import { Select } from "@/components/ui/select";
import { useStore } from "@/store";
import { encodeCardPool, encodeSealedDeck } from "@/store/lib/deck-meta";
import type {
  CardWithRelations,
  ResolvedDeck,
  SealedDeck,
} from "@/store/lib/types";
import type { DeckOptionSelectType } from "@/store/schemas/card.schema";
import { selectLimitedPoolPacks } from "@/store/selectors/lists";
import type { StoreState } from "@/store/slices";
import { debounce } from "@/utils/debounce";
import css from "./editor.module.css";
import { SelectionEditor } from "./selection-editor";

type Props = {
  deck: ResolvedDeck;
};

function getInvestigatorOptions(
  investigator: CardWithRelations,
  type: "front" | "back",
  t: TFunction,
): SelectOption[] {
  return [
    {
      value: investigator.card.code,
      label: t(`deck_edit.config.sides.original_${type}`),
    },
    {
      value: investigator.relations?.parallel?.card.code as string,
      label: t(`deck_edit.config.sides.parallel_${type}`),
    },
  ];
}

const selectUpdateName = createSelector(
  (state: StoreState) => state.updateName,
  (updateName) => debounce(updateName, 100),
);

const selectUpdateTags = createSelector(
  (state: StoreState) => state.updateTags,
  (updateTags) => debounce(updateTags, 100),
);

const selectUpdateTabooId = (state: StoreState) => state.updateTabooId;

const selectUpdateMetaProperty = (state: StoreState) =>
  state.updateMetaProperty;

const selectUpdateInvestigatorSide = (state: StoreState) =>
  state.updateInvestigatorSide;

export function MetaEditor(props: Props) {
  const { deck } = props;

  const { t } = useTranslation();

  const selectedPacks = useStore((state) =>
    selectLimitedPoolPacks(state, deck.cardPool),
  );

  const selectedPackCodes = useMemo(
    () => selectedPacks.map((pack) => pack.code),
    [selectedPacks],
  );

  const updateName = useStore(selectUpdateName);
  const updateTags = useStore(selectUpdateTags);
  const updateTabooId = useStore(selectUpdateTabooId);
  const updateMetaProperty = useStore(selectUpdateMetaProperty);
  const updateInvestigatorSide = useStore(selectUpdateInvestigatorSide);

  const onTabooChange = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      if (evt.target instanceof HTMLSelectElement) {
        const value = Number.parseInt(evt.target.value, 10);
        updateTabooId(deck.id, Number.isNaN(value) ? null : value);
      }
    },
    [updateTabooId, deck.id],
  );

  const onNameChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      if (evt.target instanceof HTMLInputElement) {
        updateName(deck.id, evt.target.value);
      }
    },
    [updateName, deck.id],
  );

  const onTagsChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      if (evt.target instanceof HTMLInputElement) {
        updateTags(deck.id, evt.target.value);
      }
    },
    [updateTags, deck.id],
  );

  const onFieldChange = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      if (evt.target instanceof HTMLSelectElement) {
        const value = evt.target.value;

        if (evt.target.dataset.field && evt.target.dataset.type) {
          updateMetaProperty(
            deck.id,
            evt.target.dataset.field,
            value || null,
            evt.target.dataset.type as DeckOptionSelectType,
          );
        }
      }
    },
    [updateMetaProperty, deck.id],
  );

  const onInvestigatorSideChange = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      if (evt.target instanceof HTMLSelectElement) {
        const value = evt.target.value;
        if (evt.target.dataset.side) {
          updateInvestigatorSide(deck.id, evt.target.dataset.side, value);
        }
      }
    },
    [updateInvestigatorSide, deck.id],
  );

  const onCardPoolChange = useCallback(
    (selectedItems: string[]) => {
      updateMetaProperty(deck.id, "card_pool", encodeCardPool(selectedItems));
    },
    [updateMetaProperty, deck.id],
  );

  const onSealedDeckChange = useCallback(
    (value: SealedDeck | undefined) => {
      const encoded = value ? encodeSealedDeck(value) : undefined;
      updateMetaProperty(deck.id, "sealed_deck", encoded?.sealed_deck ?? null);
      updateMetaProperty(
        deck.id,
        "sealed_deck_name",
        encoded?.sealed_deck_name ?? null,
      );
    },
    [deck.id, updateMetaProperty],
  );

  return (
    <div className={css["meta"]}>
      <Field full padded>
        <FieldLabel>{t("deck_edit.config.name")}</FieldLabel>
        <input
          defaultValue={deck.name}
          onChange={onNameChange}
          required
          type="text"
        />
      </Field>
      <Field full helpText={t("deck_edit.config.tags_help")} padded>
        <FieldLabel>{t("deck_edit.config.tags")}</FieldLabel>
        <input
          defaultValue={deck.tags ?? ""}
          onChange={onTagsChange}
          type="text"
        />
      </Field>

      {deck.hasParallel && (
        <>
          <Field full padded>
            <FieldLabel>
              {t("deck_edit.config.sides.investigator_front")}
            </FieldLabel>
            <Select
              data-testid="meta-investigator-front"
              data-side="front"
              onChange={onInvestigatorSideChange}
              options={getInvestigatorOptions(
                deck.cards.investigator,
                "front",
                t,
              )}
              required
              value={deck.investigatorFront.card.code}
            />
          </Field>
          <Field full padded>
            <FieldLabel>
              {t("deck_edit.config.sides.investigator_back")}
            </FieldLabel>
            <Select
              data-testid="meta-investigator-back"
              data-side="back"
              onChange={onInvestigatorSideChange}
              options={getInvestigatorOptions(
                deck.cards.investigator,
                "back",
                t,
              )}
              required
              value={deck.investigatorBack.card.code}
            />
          </Field>
        </>
      )}
      {deck.selections && (
        <SelectionEditor
          onChangeSelection={onFieldChange}
          selections={deck.selections}
        />
      )}
      <Field full padded>
        <FieldLabel htmlFor="meta-taboo-set">
          {t("deck_edit.config.taboo")}
        </FieldLabel>
        <TabooSelect
          id="meta-taboo-set"
          onChange={onTabooChange}
          value={deck.taboo_id}
        />
      </Field>

      <Field data-testid="meta-limited-card-pool" full padded bordered>
        <FieldLabel as="div">
          {t("deck_edit.config.card_pool.section_title")}
        </FieldLabel>
        <LimitedCardPoolField
          investigator={deck.cards.investigator.card}
          onValueChange={onCardPoolChange}
          selectedItems={selectedPackCodes}
        />
        <CardPoolExtensionFields deck={deck} />
        <SealedDeckField
          onValueChange={onSealedDeckChange}
          value={deck.sealedDeck}
        />
      </Field>
    </div>
  );
}
