import type { Card } from "@arkham-build/shared";
import type { TFunction } from "i18next";
import { ArrowRightLeftIcon, Settings2Icon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { LimitedCardPoolField } from "@/components/limited-card-pool/limited-card-pool-field";
import { SealedDeckField } from "@/components/limited-card-pool/sealed-deck-field";
import { ListCard } from "@/components/list-card/list-card";
import { TabooSelect } from "@/components/taboo-select";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import type { SelectOption } from "@/components/ui/select";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import { decodeSelections } from "@/store/lib/deck-meta";
import type { CardWithRelations } from "@/store/lib/types";
import { selectConnectionsData } from "@/store/selectors/connections";
import {
  selectDeckCreateChecked,
  selectDeckCreateInvestigators,
} from "@/store/selectors/deck-create";
import { selectLimitedPoolPacks } from "@/store/selectors/lists";
import { selectConnectionLock } from "@/store/selectors/shared";
import type { StorageProvider } from "@/utils/constants";
import { formatProviderName } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import { useDocumentTitle } from "@/utils/use-document-title";
import { useGoBack } from "@/utils/use-go-back";
import { useAccentColor } from "../../utils/use-accent-color";
import { SelectionEditor } from "../deck-edit/editor/selection-editor";
import css from "./deck-create.module.css";

export function DeckCreateEditor() {
  const { t } = useTranslation();

  const deckCreate = useStore(selectDeckCreateChecked);
  const { back, investigator } = useStore(selectDeckCreateInvestigators);

  useDocumentTitle(`Create ${investigator.card.real_name} deck`);

  const connections = useStore(selectConnectionsData);
  const connectionLock = useStore(selectConnectionLock);
  const provider = useStore((state) => state.deckCreate?.provider);
  const settings = useStore((state) => state.settings);

  const createDeck = useStore((state) => state.createDeck);
  const setTitle = useStore((state) => state.deckCreateSetTitle);
  const setTabooSet = useStore((state) => state.deckCreateSetTabooSet);
  const setSelection = useStore((state) => state.deckCreateSetSelection);
  const setProvider = useStore((state) => state.deckCreateSetProvider);

  const toast = useToast();
  const [, navigate] = useLocation();

  const goBack = useGoBack();

  const onDeckCreate = useCallback(async () => {
    const toastId = toast.show({
      children: t("deck_create.loading"),
      variant: "loading",
    });

    try {
      const id = await createDeck();
      navigate(`/deck/edit/${id}`, { replace: true });
      toast.dismiss(toastId);
    } catch (err) {
      toast.dismiss(toastId);
      toast.show({
        children: t("deck_create.error", { error: (err as Error).message }),
        variant: "error",
      });
    }
  }, [toast, createDeck, navigate, t]);

  const setInvestigatorCode = useStore(
    (state) => state.deckCreateSetInvestigatorCode,
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
      defaultStorageProvider: deckCreate.provider as StorageProvider,
    });
  }, [deckCreate.provider]);

  const investigatorActionRenderer = useCallback(
    (card: Card) => (
      <Button size="sm" onClick={() => setInvestigatorCode(card.code)}>
        <ArrowRightLeftIcon />
        {t("deck_edit.config.version.switch")}
      </Button>
    ),
    [setInvestigatorCode, t],
  );

  const selections = decodeSelections(back, deckCreate.selections);
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

  const providerChanged =
    deckCreate.provider !== settings.defaultStorageProvider;

  return (
    <div className={css["editor"]} style={cssVariables}>
      <Field full padded>
        <FieldLabel htmlFor="provider">
          {t("deck_edit.config.storage_provider.title")}
        </FieldLabel>
        <Select
          data-testid="create-provider"
          name="provider"
          options={storageProviderOptions}
          onChange={(evt) => {
            setProvider(evt.target.value);
          }}
          required
          value={deckCreate.provider}
        />
        {providerChanged && (
          <Button
            className={css["provider-default"]}
            data-testid="create-provider-set-default"
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
          data-testid="create-title"
          name="title"
          onChange={onInputChange}
          type="text"
          value={deckCreate.title}
        />
      </Field>

      <Field full padded>
        <FieldLabel htmlFor="create-taboo">
          {t("deck_edit.config.taboo")}
        </FieldLabel>
        <TabooSelect
          id="create-taboo"
          onChange={onTabooSetChange}
          value={deckCreate.tabooSetId}
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
              data-testid="create-investigator-front"
              name="investigator-front"
              onChange={onInvestigatorChange}
              options={getInvestigatorOptions(investigator, "front", t)}
              required
              value={deckCreate.investigatorFrontCode}
            />
          </Field>
          <Field full padded>
            <FieldLabel htmlFor="investigator-back">
              {t("deck_edit.config.sides.investigator_back")}
            </FieldLabel>
            <Select
              data-side="back"
              data-testid="create-investigator-back"
              name="investigator-back"
              onChange={onInvestigatorChange}
              options={getInvestigatorOptions(investigator, "back", t)}
              required
              value={deckCreate.investigatorBackCode}
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

      {!isEmpty(investigator.relations?.otherVersions) && (
        <Field>
          <FieldLabel>{t("deck_edit.config.version.title")}</FieldLabel>
          <ListCard
            card={investigator.relations.otherVersions[0].card}
            size="sm"
            omitBorders
            renderCardExtra={investigatorActionRenderer}
          />
        </Field>
      )}

      <DeckCreateCardPool investigator={investigator.card} />

      <nav className={css["editor-nav"]}>
        <Button
          data-testid="create-save"
          disabled={!!connectionLock && provider === "arkhamdb"}
          onClick={onDeckCreate}
          tooltip={
            connectionLock && provider === "arkhamdb"
              ? connectionLock
              : undefined
          }
          variant="primary"
        >
          {t("deck.actions.create")}
        </Button>
        <Button onClick={goBack} type="button" variant="bare">
          {t("common.cancel")}
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

function DeckCreateCardPool({ investigator }: { investigator: Card }) {
  const { t } = useTranslation();

  const setCardPool = useStore((state) => state.deckCreateSetCardPool);
  const setSealedDeck = useStore((state) => state.deckCreateSetSealed);

  const deckCreate = useStore((state) => state.deckCreate);

  const sealedDeck = useMemo(
    () =>
      deckCreate?.sealed
        ? {
            name: deckCreate.sealed.name,
            cards: deckCreate.sealed.cards,
          }
        : undefined,
    [deckCreate],
  );

  const selectedPacks = useStore((state) =>
    selectLimitedPoolPacks(state, deckCreate?.cardPool),
  );

  const selectedItems = useMemo(
    () => selectedPacks.map((p) => p.code),
    [selectedPacks],
  );

  return (
    <Field full padded bordered>
      <FieldLabel>{t("deck_edit.config.card_pool.section_title")}</FieldLabel>
      <LimitedCardPoolField
        investigator={investigator}
        onValueChange={setCardPool}
        selectedItems={selectedItems}
      />
      <SealedDeckField onValueChange={setSealedDeck} value={sealedDeck} />
    </Field>
  );
}
