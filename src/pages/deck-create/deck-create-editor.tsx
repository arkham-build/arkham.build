import { ListCard } from "@/components/list-card/list-card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import type { SelectOption } from "@/components/ui/select";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import { decodeSelections } from "@/store/lib/deck-meta";
import type { CardWithRelations } from "@/store/lib/types";
import { selectConnections } from "@/store/selectors/connections";
import {
  selectDeckCreateChecked,
  selectDeckCreateInvestigators,
} from "@/store/selectors/deck-create";
import { selectTabooSetSelectOptions } from "@/store/selectors/lists";
import { selectConnectionLock } from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import {
  capitalize,
  capitalizeSnakeCase,
  formatProviderName,
} from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import { useGoBack } from "@/utils/use-go-back";
import type { TFunction } from "i18next";
import { ArrowRightLeftIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useAccentColor } from "../../utils/use-accent-color";
import { DeckCreateCardPool } from "./deck-create-card-pool";
import css from "./deck-create.module.css";

export function DeckCreateEditor() {
  const { t } = useTranslation();

  const deckCreate = useStore(selectDeckCreateChecked);
  const { back, investigator } = useStore(selectDeckCreateInvestigators);

  const connections = useStore(selectConnections);
  const connectionLock = useStore(selectConnectionLock);
  const tabooSets = useStore(selectTabooSetSelectOptions);
  const provider = useStore((state) => state.deckCreate?.provider);

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
      children: "Creating deck",
      variant: "loading",
    });

    try {
      const id = await createDeck();
      navigate(`/deck/edit/${id}`, { replace: true });
      toast.dismiss(toastId);
      toast.show({
        children: "Deck create successful.",
        duration: 3000,
        variant: "success",
      });
    } catch (err) {
      toast.dismiss(toastId);
      toast.show({
        children: `Deck create failed: ${(err as Error)?.message || "Unknown error"}`,
        variant: "error",
      });
    }
  }, [toast, createDeck, navigate]);

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

  const onSelectionChange = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      if (evt.target instanceof HTMLSelectElement) {
        const key = evt.target.dataset.field;
        const value = evt.target.value;
        if (key) setSelection(key, value);
      }
    },
    [setSelection],
  );

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
  const cssVariables = useAccentColor(investigator.card.faction_code);

  return (
    <div className={css["editor"]} style={cssVariables}>
      {!isEmpty(connections) && (
        <Field full padded>
          <FieldLabel htmlFor="provider">
            {t("deck_edit.config.storage_provider.title")}
          </FieldLabel>
          <Select
            name="provider"
            emptyLabel={t("deck_edit.config.storage_provider.local")}
            options={connections.map((connection) => ({
              label: formatProviderName(connection.provider),
              value: connection.provider,
            }))}
            onChange={(evt) => {
              setProvider(evt.target.value);
            }}
            value={deckCreate.provider}
          />
        </Field>
      )}
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
        <FieldLabel htmlFor="taboo">{t("deck_edit.config.taboo")}</FieldLabel>
        <Select
          data-testid="create-taboo"
          emptyLabel="None"
          name="taboo"
          onChange={onTabooSetChange}
          options={tabooSets}
          value={deckCreate.tabooSetId ?? ""}
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

      {selections &&
        Object.entries(selections).map(([key, value]) => (
          <Field full key={key} padded>
            <FieldLabel>{capitalizeSnakeCase(key)}</FieldLabel>
            {(value.type === "deckSize" || value.type === "faction") && (
              <Select
                data-testid={`create-select-${key}`}
                data-field={value.accessor}
                data-type={value.type}
                emptyLabel={t("common.none")}
                onChange={onSelectionChange}
                options={value.options.map((v) => ({
                  value: v,
                  label: capitalize(v),
                }))}
                value={value.value ?? ""}
              />
            )}
            {value.type === "option" && (
              <Select
                data-field={value.accessor}
                data-testid={`create-select-${key}`}
                data-type={value.type}
                emptyLabel={t("common.none")}
                onChange={onSelectionChange}
                options={value.options.map((v) => ({
                  value: v.id,
                  label: v.name,
                }))}
                value={value.value?.id ?? ""}
              />
            )}
          </Field>
        ))}

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

      <DeckCreateCardPool />

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
          {t("deck_create.actions.create")}
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
