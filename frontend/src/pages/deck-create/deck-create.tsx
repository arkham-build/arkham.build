import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearch } from "wouter";
import { CardBack } from "@/components/card/card-back";
import { CardContainer } from "@/components/card/card-container";
import { CardFace } from "@/components/card/card-face";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { CardSet } from "@/components/cardset";
import { Footer } from "@/components/footer";
import { Masthead } from "@/components/masthead";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import {
  selectDeckCreateCardSets,
  selectDeckCreateInvestigators,
} from "@/store/selectors/deck-create";
import { querySealedDeck } from "@/store/services/queries";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import css from "./deck-create.module.css";
import { DeckCreateEditor } from "./deck-create-editor";

function DeckCreate() {
  const { code } = useParams<{ code: string }>();
  const search = useSearch();

  const { t } = useTranslation();
  const toast = useToast();

  const deckCreate = useStore((state) => state.deckCreate);
  const destroy = useStore((state) => state.resetCreate);
  const initialize = useStore((state) => state.initCreate);
  const setSealedDeck = useStore((state) => state.deckCreateSetSealed);

  useEffect(() => {
    let mounted = true;
    let toastId: string | undefined;

    const params = new URLSearchParams(search);

    const initialInvestigatorChoice = params
      .get("initial_investigator")
      ?.toString();

    initialize(code, initialInvestigatorChoice);

    async function applySealedDeck(id: string) {
      toastId = toast.show({
        variant: "loading",
        children: t("deck_create.sealed_deck.loading"),
      });

      try {
        const sealedDeck = await querySealedDeck(id);
        if (!mounted) return;

        setSealedDeck(sealedDeck);
        toast.dismiss(toastId);
        toast.show({
          variant: "success",
          children: t("deck_create.sealed_deck.success"),
          duration: 3000,
        });
      } catch (err) {
        if (!mounted) return;
        toast.dismiss(toastId);
        toast.show({
          variant: "error",
          children: t("deck_create.sealed_deck.error", {
            error: (err as Error).message,
          }),
          duration: 3000,
        });
      }
    }

    const sealedDeckId = params.get("sealed_deck_id")?.toString();
    if (sealedDeckId) applySealedDeck(sealedDeckId);

    return () => {
      if (toastId) toast.dismiss(toastId);
      mounted = false;
      destroy();
    };
  }, [code, destroy, initialize, search, setSealedDeck, t, toast]);

  return deckCreate ? (
    <CardModalProvider>
      <DeckCreateInner />
    </CardModalProvider>
  ) : null;
}

function DeckCreateInner() {
  return (
    <div className={cx(css["layout"], "fade-in")}>
      <Masthead className={css["layout-header"]} />
      <div className={css["layout-sidebar"]}>
        <DeckCreateEditor />
      </div>
      <div className={css["layout-content"]}>
        <DeckCreateInvestigator />
      </div>
      <div className={css["layout-selections"]}>
        <DeckCreateCardSets />
      </div>
      <footer className={css["layout-footer"]}>
        <Footer />
      </footer>
    </div>
  );
}

function DeckCreateInvestigator() {
  const { back, front } = useStore(selectDeckCreateInvestigators);

  const setInvestigatorCode = useStore(
    (state) => state.deckCreateSetInvestigatorCode,
  );

  return (
    <div className={css["cards"]}>
      <CardContainer size="full">
        <CardFace
          onPrintingSelect={(card) => {
            if (!card.parallel) {
              setInvestigatorCode(card.code);
            }
          }}
          resolvedCard={front}
          size="full"
        />
        <CardBack card={back.card} size="full" />
      </CardContainer>
    </div>
  );
}

function DeckCreateCardSets() {
  const onChangeCardQuantity = useStore(
    (state) => state.deckCreateChangeExtraCardQuantity,
  );

  const toggleConfigureCardSet = useStore(
    (state) => state.deckCreateToggleCardSet,
  );

  const cardSets = useStore(selectDeckCreateCardSets);

  const onCheckedChange = useCallback(
    (id: string) => {
      toggleConfigureCardSet(id);
    },
    [toggleConfigureCardSet],
  );

  const { investigator } = useStore(selectDeckCreateInvestigators);
  const cssVariables = useAccentColor(investigator.card);

  return (
    <div className={css["card-selections"]} style={cssVariables}>
      {cardSets.map((set) =>
        set.cards.length ? (
          <CardSet
            key={set.id}
            onChangeCardQuantity={onChangeCardQuantity}
            onSelect={onCheckedChange}
            set={set}
          />
        ) : null,
      )}
    </div>
  );
}

export default DeckCreate;
