import type { TFunction } from "i18next";
import { DicesIcon, Settings2Icon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LimitedCardPoolField } from "@/components/limited-card-pool/limited-card-pool-field";
import { SealedDeckField } from "@/components/limited-card-pool/sealed-deck-field";
import { TabooSelect } from "@/components/taboo-select";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import type { SelectOption } from "@/components/ui/select";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/store";
import { decodeSelections } from "@/store/lib/deck-meta";
import type { CardWithRelations } from "@/store/lib/types";
import { selectConnectionsData } from "@/store/selectors/connections";
import { selectCanStartDraft } from "@/store/selectors/draft";
import { selectLimitedPoolPacks } from "@/store/selectors/lists";
import { assert } from "@/utils/assert";
import type { StorageProvider } from "@/utils/constants";
import { formatProviderName } from "@/utils/formatting";
import { useAccentColor } from "@/utils/use-accent-color";
import css from "../deck-create/deck-create.module.css";
import { SelectionEditor } from "../deck-edit/editor/selection-editor";

type Props = {
  investigator: CardWithRelations;
  back: CardWithRelations;
  onStart: () => void;
};

export function DraftSetupEditor(props: Props) {
  const { investigator, back, onStart } = props;
  const { t } = useTranslation();

  const draft = useStore((state) => state.draft);
  assert(draft, "Draft must be initialized.");

  const connections = useStore(selectConnectionsData);
  const settings = useStore((state) => state.settings);

  const setTitle = useStore((state) => state.draftSetTitle);
  const setTabooSet = useStore((state) => state.draftSetTabooSet);
  const setProvider = useStore((state) => state.draftSetProvider);
  const setInvestigatorCode = useStore(
    (state) => state.draftSetInvestigatorCode,
  );
  const setSelection = useStore((state) => state.draftSetSelection);
  const setCardPool = useStore((state) => state.draftSetCardPool);
  const setSealedDeck = useStore((state) => state.draftSetSealed);
  const setCardsPerPick = useStore((state) => state.draftSetCardsPerPick);
  const setSkipsAllowed = useStore((state) => state.draftSetSkipsAllowed);

  // Use investigatorBackCode for card pool validation since deck building rules are on the back card
  const { canStart, required, available } = useStore((state) =>
    selectCanStartDraft(state, draft.investigatorBackCode),
  );

  const onInputChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      if (evt.target instanceof HTMLInputElement) {
        setTitle(evt.target.value);
      }
    },
    [setTitle],
  );

  const onTabooSetChange = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      if (evt.target instanceof HTMLSelectElement) {
        const value = evt.target.value;
        setTabooSet(value ? Number.parseInt(value, 10) : undefined);
      }
    },
    [setTabooSet],
  );

  const onInvestigatorChange = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      if (evt.target instanceof HTMLSelectElement) {
        const side = evt.target.getAttribute("data-side") as "front" | "back";
        const value = evt.target.value;
        setInvestigatorCode(value, side);
      }
    },
    [setInvestigatorCode],
  );

  const onChangeSelection = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      if (evt.target instanceof HTMLSelectElement) {
        const key = evt.target.dataset.field;
        const value = evt.target.value;
        if (key) setSelection(key, value);
      }
    },
    [setSelection],
  );

  const onStorageDefaultChange = useCallback(() => {
    const state = useStore.getState();

    state.setSettings({
      defaultStorageProvider: draft.provider as StorageProvider,
    });
  }, [draft.provider]);

  const selections = decodeSelections(back, draft.selections);
  const cssVariables = useAccentColor(investigator.card);

  const storageProviderOptions = useMemo(
    () => [
      {
        label: t("deck_edit.config.storage_provider.local"),
        value: "local",
      },
      {
        label: t("deck_edit.config.storage_provider.shared"),
        value: "shared",
      },
      ...connections.map((connection) => ({
        label: formatProviderName(connection.provider),
        value: connection.provider,
      })),
    ],
    [t, connections],
  );

  const providerChanged = draft.provider !== settings.defaultStorageProvider;

  const sealedDeck = useMemo(
    () =>
      draft.sealed
        ? {
            name: draft.sealed.name,
            cards: draft.sealed.cards,
          }
        : undefined,
    [draft],
  );

  const selectedPacks = useStore((state) =>
    selectLimitedPoolPacks(state, draft.cardPool ?? undefined),
  );

  const selectedItems = useMemo(
    () => selectedPacks.map((p) => p.code),
    [selectedPacks],
  );

  return (
    <div className={css["editor"]} style={cssVariables}>
      <Field full padded>
        <FieldLabel htmlFor="provider">
          {t("deck_edit.config.storage_provider.title")}
        </FieldLabel>
        <Select
          data-testid="draft-provider"
          name="provider"
          options={storageProviderOptions}
          onChange={(evt) => {
            setProvider(evt.target.value as StorageProvider);
          }}
          required
          value={draft.provider}
        />
        {providerChanged && (
          <Button
            className={css["provider-default"]}
            data-testid="draft-provider-set-default"
            onClick={onStorageDefaultChange}
            size="xs"
            variant="primary"
          >
            <Settings2Icon />
            {t("common.set_as_default")}
          </Button>
        )}
      </Field>
      <Field full padded>
        <FieldLabel htmlFor="title">{t("deck_edit.config.name")}</FieldLabel>
        <input
          data-testid="draft-title"
          name="title"
          onChange={onInputChange}
          type="text"
          value={draft.title}
        />
      </Field>

      <Field full padded>
        <FieldLabel htmlFor="draft-taboo">
          {t("deck_edit.config.taboo")}
        </FieldLabel>
        <TabooSelect
          id="draft-taboo"
          onChange={onTabooSetChange}
          value={draft.tabooSetId}
        />
      </Field>

      {investigator.relations?.parallel && (
        <>
          <Field full padded>
            <FieldLabel htmlFor="investigator-front">
              {t("deck_edit.config.sides.investigator_front")}
            </FieldLabel>
            <Select
              data-side="front"
              data-testid="draft-investigator-front"
              name="investigator-front"
              onChange={onInvestigatorChange}
              options={getInvestigatorOptions(investigator, "front", t)}
              required
              value={draft.investigatorFrontCode}
            />
          </Field>
          <Field full padded>
            <FieldLabel htmlFor="investigator-back">
              {t("deck_edit.config.sides.investigator_back")}
            </FieldLabel>
            <Select
              data-side="back"
              data-testid="draft-investigator-back"
              name="investigator-back"
              onChange={onInvestigatorChange}
              options={getInvestigatorOptions(investigator, "back", t)}
              required
              value={draft.investigatorBackCode}
            />
          </Field>
        </>
      )}

      {selections && (
        <SelectionEditor
          onChangeSelection={onChangeSelection}
          selections={selections}
        />
      )}

      <Field full padded bordered>
        <FieldLabel>{t("deck_edit.config.card_pool.section_title")}</FieldLabel>
        <LimitedCardPoolField
          investigator={investigator.card}
          onValueChange={setCardPool}
          selectedItems={selectedItems}
        />
        <SealedDeckField onValueChange={setSealedDeck} value={sealedDeck} />
      </Field>

      <Field full padded>
        <FieldLabel htmlFor="cards-per-pick">
          {t("deck_draft.setup.cards_per_pick")}
        </FieldLabel>
        <div className={css["slider-container"]}>
          <Slider
            id="cards-per-pick"
            min={2}
            max={15}
            step={1}
            value={[draft.cardsPerPick]}
            onValueChange={(value) => setCardsPerPick(value[0])}
            className={css["slider-flex"]}
          />
          <output htmlFor="cards-per-pick" className={css["slider-output"]}>
            {draft.cardsPerPick}
          </output>
        </div>
      </Field>

      <Field full padded>
        <FieldLabel htmlFor="skips-allowed">
          {t("deck_draft.setup.skips_allowed")}
        </FieldLabel>
        <div className={css["slider-container"]}>
          <Slider
            id="skips-allowed"
            min={0}
            max={5}
            step={1}
            value={[draft.skipsAllowed]}
            onValueChange={(value) => setSkipsAllowed(value[0])}
            className={css["slider-flex"]}
          />
          <output htmlFor="skips-allowed" className={css["slider-output"]}>
            {draft.skipsAllowed}
          </output>
        </div>
      </Field>

      {!canStart && (
        <Field full padded>
          <div className={css["error-message"]}>
            {t("deck_draft.setup.insufficient_cards", { required, available })}
          </div>
        </Field>
      )}

      <nav className={css["editor-nav"]}>
        <Button
          data-testid="draft-start"
          disabled={!canStart}
          onClick={onStart}
          variant="primary"
        >
          <DicesIcon />
          {t("deck_draft.setup.start")}
        </Button>
      </nav>
    </div>
  );
}

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
