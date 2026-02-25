import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams, useSearch } from "wouter";
import { CardBack } from "@/components/card/card-back";
import { CardContainer } from "@/components/card/card-container";
import { CardFace } from "@/components/card/card-face";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { CardSet } from "@/components/cardset";
import { Footer } from "@/components/footer";
import { Masthead } from "@/components/masthead";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import { createDeck } from "@/store/lib/deck-factory";
import {
  encodeCardPool,
  encodeCustomizations,
  encodeSealedDeck,
} from "@/store/lib/deck-meta";
import { resolveDeck } from "@/store/lib/resolve-deck";
import {
  disconnectProviderIfUnauthorized,
  syncAdapters,
} from "@/store/lib/sync";
import type { Customizations, ResolvedDeck } from "@/store/lib/types";
import { dehydrate } from "@/store/persist";
import {
  selectDraftCardSets,
  selectDraftChecked,
  selectDraftInvestigators,
} from "@/store/selectors/draft";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import { newDeck, updateDeck } from "@/store/services/queries";
import { assertCanPublishDeck } from "@/utils/arkhamdb";
import { displayAttribute, isSpecialCard } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import { useDocumentTitle } from "@/utils/use-document-title";
import { ResolvedDeckProvider } from "@/utils/use-resolved-deck";
import css from "./deck-draft.module.css";
import { DraftEditor } from "./draft-editor";
import { DraftPicker } from "./draft-picker";
import { DraftSetupEditor } from "./draft-setup-editor";

function DeckDraft() {
  const { code } = useParams<{ code: string }>();
  const search = useSearch();

  const draft = useStore((state) => state.draft);
  const initDraft = useStore((state) => state.initDraft);
  const initUpgradeDraft = useStore((state) => state.initUpgradeDraft);
  const draftSetSkipsAllowed = useStore((state) => state.draftSetSkipsAllowed);
  const draftSetResearchedCards = useStore(
    (state) => state.draftSetResearchedCards,
  );
  const resetDraft = useStore((state) => state.resetDraft);

  // Initialize draft on mount
  useEffect(() => {
    const params = new URLSearchParams(search);
    const upgradeDeckId = params.get("upgrade_deck");
    const upgradeXp = params.get("xp");
    const previousRemainingXp = params.get("previous_remaining_xp");
    const totalAvailableXp = params.get("total_available_xp");
    const cardsPerPick = params.get("cards_per_pick");
    const skipsAllowed = params.get("skips_allowed");
    const researchedParam = params.get("researched");

    // Check if this is an upgrade draft
    if (upgradeDeckId && upgradeXp !== null) {
      const newXp = Number.parseInt(upgradeXp, 10);
      const prevRemaining = previousRemainingXp
        ? Number.parseInt(previousRemainingXp, 10)
        : 0;
      const totalAvailable = totalAvailableXp
        ? Number.parseInt(totalAvailableXp, 10)
        : undefined;
      const cardsPerPickValue = Number.parseInt(cardsPerPick || "5", 10);
      const skipsAllowedValue = Number.parseInt(skipsAllowed || "0", 10);
      // Allow upgrade draft even with 0 new XP if there's remaining XP or total available XP
      if (
        !Number.isNaN(newXp) &&
        (newXp > 0 ||
          prevRemaining > 0 ||
          (totalAvailable && totalAvailable > 0))
      ) {
        initUpgradeDraft(
          upgradeDeckId,
          newXp,
          cardsPerPickValue,
          prevRemaining,
          totalAvailable,
        );
        // Set skips allowed after initialization
        if (skipsAllowedValue > 0) {
          draftSetSkipsAllowed(skipsAllowedValue);
        }
        // Set researched cards after initialization
        if (researchedParam) {
          const researchedCardsArray = researchedParam
            .split(",")
            .filter(Boolean);
          if (researchedCardsArray.length > 0) {
            draftSetResearchedCards(researchedCardsArray);
          }
        }
        return () => {
          resetDraft();
        };
      }
    }

    // Normal draft initialization
    const initialInvestigatorChoice = params
      .get("initial_investigator")
      ?.toString();

    initDraft(code, initialInvestigatorChoice);

    return () => {
      resetDraft();
    };
  }, [
    code,
    search,
    initDraft,
    initUpgradeDraft,
    resetDraft,
    draftSetSkipsAllowed,
    draftSetResearchedCards,
  ]);

  // Create resolved deck at this level so CardModal can access it
  // Only create resolved deck if draft exists (selectDraftInvestigators requires draft)
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const collator = useStore(selectLocaleSortingCollator);

  // Safely get investigators only when draft exists
  const investigators = useStore((state) => {
    if (!state.draft) return null;
    try {
      return selectDraftInvestigators(state);
    } catch {
      return null;
    }
  });
  const investigator = investigators?.investigator;

  const resolvedDraftDeck = useMemo((): ResolvedDeck | null => {
    if (!draft || !investigator) return null;

    const investigatorCard = metadata.cards[draft.investigatorFrontCode];
    if (!investigatorCard) return null;

    // Combine signature cards and picked cards
    const slots: Record<string, number> = {
      ...draft.signatureCards,
      ...draft.pickedCards,
    };

    // Create a minimal deck
    const meta: Record<string, string | null> = {};

    // Only set alternate_front if it's different from the base investigator
    if (draft.investigatorFrontCode !== draft.investigatorCode) {
      meta.alternate_front = draft.investigatorFrontCode;
    }

    // Only set alternate_back if it's different from the base investigator
    if (draft.investigatorBackCode !== draft.investigatorCode) {
      meta.alternate_back = draft.investigatorBackCode;
    }

    // Merge customization upgrades into meta if present
    if (
      draft.customizationUpgrades &&
      Object.keys(draft.customizationUpgrades).length > 0
    ) {
      // Convert customizationUpgrades to Customizations format
      const customizationsToMerge: Customizations = {};
      for (const [cardCode, upgrades] of Object.entries(
        draft.customizationUpgrades,
      )) {
        customizationsToMerge[cardCode] = {};
        for (const [indexStr, xpSpent] of Object.entries(upgrades)) {
          const index = Number.parseInt(indexStr, 10);
          // Create Customization object with index and xp_spent
          // selections is optional and omitted if not needed
          customizationsToMerge[cardCode][index] = {
            index,
            xp_spent: xpSpent,
          };
        }
      }

      // For upgrade mode, merge with existing customizations from the original deck
      if (draft.upgradeDeckId) {
        const state = useStore.getState();
        const originalDeck = state.data.decks[draft.upgradeDeckId];
        if (originalDeck) {
          const existingResolved = resolveDeck(
            {
              lookupTables,
              metadata,
              sharing: state.sharing,
            },
            collator,
            originalDeck,
          );
          const existingCustomizations = existingResolved.customizations ?? {};

          // Merge: existing customizations take precedence, then add new upgrades
          const mergedCustomizations: Customizations = {
            ...existingCustomizations,
          };
          for (const [cardCode, upgrades] of Object.entries(
            customizationsToMerge,
          )) {
            if (!mergedCustomizations[cardCode]) {
              mergedCustomizations[cardCode] = {};
            }
            for (const [indexStr, customization] of Object.entries(upgrades)) {
              const index = Number.parseInt(indexStr, 10);
              const existing = mergedCustomizations[cardCode][index];
              // Use the higher xp_spent value (in case of partial upgrades)
              if (!existing || customization.xp_spent > existing.xp_spent) {
                mergedCustomizations[cardCode][index] = customization;
              }
            }
          }

          // Encode and merge into meta
          const encodedCustomizations =
            encodeCustomizations(mergedCustomizations);
          Object.assign(meta, encodedCustomizations);
        } else {
          // No original deck found, just use the new customizations
          const encodedCustomizations = encodeCustomizations(
            customizationsToMerge,
          );
          Object.assign(meta, encodedCustomizations);
        }
      } else {
        // New draft mode - just encode the customizations
        const encodedCustomizations = encodeCustomizations(
          customizationsToMerge,
        );
        Object.assign(meta, encodedCustomizations);
      }
    }

    const deck = createDeck({
      investigator_code: draft.investigatorCode,
      investigator_name: investigator.card.real_name,
      name: draft.title,
      slots,
      meta: JSON.stringify(meta),
      taboo_id: draft.tabooSetId ?? null,
      problem: null,
    });

    // Resolve the deck to get ResolvedDeck structure
    try {
      return resolveDeck(
        { metadata, lookupTables, sharing: { decks: {} } },
        collator,
        deck,
      );
    } catch {
      return null;
    }
  }, [draft, investigator, metadata, lookupTables, collator]);

  if (!draft) return null;

  return resolvedDraftDeck ? (
    <ResolvedDeckProvider resolvedDeck={resolvedDraftDeck} canEdit={false}>
      <CardModalProvider>
        <DeckDraftInner resolvedDraftDeck={resolvedDraftDeck} />
      </CardModalProvider>
    </ResolvedDeckProvider>
  ) : null;
}

function DeckDraftInner(props: { resolvedDraftDeck: ResolvedDeck }) {
  const { resolvedDraftDeck } = props;
  const { t } = useTranslation();
  const toast = useToast();
  const [, navigate] = useLocation();

  const metadata = useStore(selectMetadata);
  const draft = useStore(selectDraftChecked);
  const startDraft = useStore((state) => state.startDraft);
  const pickDraftCard = useStore((state) => state.pickDraftCard);
  const pickDraftCustomization = useStore(
    (state) => state.pickDraftCustomization,
  );
  const generateDraftOptions = useStore((state) => state.generateDraftOptions);
  const resetDraft = useStore((state) => state.resetDraft);
  const createShare = useStore((state) => state.createShare);
  const setRemoting = useStore((state) => state.setRemoting);
  const upgradeDeck = useStore((state) => state.upgradeDeck);

  const { investigator, back } = useStore(selectDraftInvestigators);

  useDocumentTitle(`${t("deck_draft.title")}: ${investigator.card.real_name}`);

  // Calculate deck size excluding special cards (same logic as decodeSlots)
  const currentDeckSize = (() => {
    let size = 0;
    for (const [cardCode, quantity] of Object.entries(draft.pickedCards)) {
      const card = metadata.cards[cardCode];
      if (card && !isSpecialCard(card)) {
        size += quantity;
      }
    }
    return size;
  })();

  const accentColor = useAccentColor(investigator.card);

  const handleStart = useCallback(() => {
    startDraft();
  }, [startDraft]);

  const handlePick = useCallback(
    (cardCode: string, quantity?: number) => {
      pickDraftCard(cardCode, quantity);
    },
    [pickDraftCard],
  );

  const handleRestart = useCallback(() => {
    // Save current settings before resetting
    const currentDraft = draft;
    if (!currentDraft) return;

    const savedSettings = {
      provider: currentDraft.provider,
      title: currentDraft.title,
      tabooSetId: currentDraft.tabooSetId,
      cardPool: currentDraft.cardPool,
      sealed: currentDraft.sealed,
      selections: currentDraft.selections,
      cardsPerPick: currentDraft.cardsPerPick,
      investigatorFrontCode: currentDraft.investigatorFrontCode,
      investigatorBackCode: currentDraft.investigatorBackCode,
    };

    // Reset only the picking progress, preserving settings
    useStore.setState((state) => {
      if (!state.draft) return state;
      return {
        draft: {
          ...state.draft,
          phase: state.draft.mode === "upgrade" ? "picking" : "setup",
          pickedCards:
            state.draft.mode === "upgrade"
              ? (() => {
                  // For upgrade mode, restore original deck cards (excluding signatures)
                  const originalDeck =
                    state.data.decks[state.draft.upgradeDeckId || ""];
                  if (!originalDeck) return {};
                  const signatureCards = state.draft.signatureCards;
                  const originalPickedCards: Record<string, number> = {};
                  for (const [code, quantity] of Object.entries(
                    originalDeck.slots,
                  )) {
                    if (!signatureCards[code]) {
                      originalPickedCards[code] = quantity;
                    }
                  }
                  return originalPickedCards;
                })()
              : {},
          currentOptions: [],
          remainingXp:
            state.draft.mode === "upgrade"
              ? state.draft.totalXp + (state.draft.previousRemainingXp ?? 0)
              : 0,
          skipsUsed: 0,
        },
      };
    });

    // Restore settings
    const state = useStore.getState();
    if (state.draft) {
      useStore.setState({
        draft: {
          ...state.draft,
          ...savedSettings,
          skipsUsed: 0,
        },
      });

      // If in upgrade mode, regenerate options immediately
      // If in normal mode, user needs to click "Start" again
      if (state.draft.mode === "upgrade") {
        generateDraftOptions();
      }
    }
  }, [draft, generateDraftOptions]);

  const handleSave = useCallback(async () => {
    if (!draft || !investigator) return;

    const toastId = toast.show({
      children: t("deck_create.loading"),
      variant: "loading",
    });

    try {
      const state = useStore.getState();
      const metadata = selectMetadata(state);
      const lookupTables = selectLookupTables(state);
      const collator = selectLocaleSortingCollator(state);

      // Handle upgrade mode
      if (draft.mode === "upgrade" && draft.upgradeDeckId) {
        const originalDeck = state.data.decks[draft.upgradeDeckId];
        if (!originalDeck) {
          throw new Error("Original deck not found");
        }

        // Merge picked cards with original deck slots
        // pickedCards already contains original deck cards (from initUpgradeDraft)
        // plus any new upgrade cards picked during the draft
        // We also need to include signature cards
        const mergedSlots: Record<string, number> = {
          ...draft.signatureCards,
          ...draft.pickedCards,
        };

        // Merge customization upgrades into deck meta
        const originalMeta = JSON.parse(originalDeck.meta || "{}");
        const customizationUpgrades = draft.customizationUpgrades ?? {};

        // Convert customizationUpgrades to Customizations format
        const customizationsToMerge: Customizations = {};
        for (const [cardCode, upgrades] of Object.entries(
          customizationUpgrades,
        )) {
          customizationsToMerge[cardCode] = {};
          for (const [indexStr, xpSpent] of Object.entries(upgrades)) {
            const index = Number.parseInt(indexStr, 10);
            customizationsToMerge[cardCode][index] = {
              index,
              xp_spent: xpSpent,
            };
          }
        }

        // Merge with existing customizations from the original deck
        const resolvedOriginal = resolveDeck(
          {
            lookupTables,
            metadata,
            sharing: state.sharing,
          },
          collator,
          originalDeck,
        );
        const existingCustomizations = resolvedOriginal.customizations ?? {};

        // Merge: existing customizations take precedence, then add new upgrades
        const mergedCustomizations: Customizations = {
          ...existingCustomizations,
        };
        for (const [cardCode, upgrades] of Object.entries(
          customizationsToMerge,
        )) {
          if (!mergedCustomizations[cardCode]) {
            mergedCustomizations[cardCode] = {};
          }
          for (const [indexStr, customization] of Object.entries(upgrades)) {
            const index = Number.parseInt(indexStr, 10);
            const existing = mergedCustomizations[cardCode][index];
            // Use the higher xp_spent value (in case of partial upgrades)
            if (!existing || customization.xp_spent > existing.xp_spent) {
              mergedCustomizations[cardCode][index] = customization;
            }
          }
        }

        // Encode customizations and merge into meta
        const encodedCustomizations =
          encodeCustomizations(mergedCustomizations);
        const mergedMeta = {
          ...originalMeta,
          ...encodedCustomizations,
        };

        // Calculate XP spent from NEW XP only
        // remainingXp includes both previous remaining and new XP
        // newXpRemaining = remainingXp - previousRemainingXp (but can't be negative)
        const previousRemaining = draft.previousRemainingXp ?? 0;
        const newXpRemaining = Math.max(
          0,
          draft.remainingXp - previousRemaining,
        );
        const newXpSpent = draft.totalXp - newXpRemaining;

        // Temporarily update the deck's slots and meta with merged values
        const originalSlots = originalDeck.slots;
        const originalMetaStr = originalDeck.meta;
        useStore.setState({
          data: {
            ...state.data,
            decks: {
              ...state.data.decks,
              [draft.upgradeDeckId]: {
                ...originalDeck,
                slots: mergedSlots,
                meta: JSON.stringify(mergedMeta),
              },
            },
          },
        });

        try {
          // Call upgradeDeck which will create a new deck with the merged slots
          // Only pass NEW XP spent - upgradeDeck will handle remaining XP automatically
          const newDeck = await upgradeDeck({
            id: draft.upgradeDeckId,
            xp: newXpSpent,
            exileString: draft.exileString ?? "",
            usurped: undefined,
          });

          // Restore original deck slots and meta
          useStore.setState({
            data: {
              ...useStore.getState().data,
              decks: {
                ...useStore.getState().data.decks,
                [draft.upgradeDeckId]: {
                  ...originalDeck,
                  slots: originalSlots,
                  meta: originalMetaStr,
                },
              },
            },
          });

          toast.dismiss(toastId);
          resetDraft();
          navigate(`/deck/edit/${newDeck.id}`, { replace: true });
          return;
        } catch (err) {
          // Restore original deck slots and meta on error
          useStore.setState({
            data: {
              ...useStore.getState().data,
              decks: {
                ...useStore.getState().data.decks,
                [draft.upgradeDeckId]: {
                  ...originalDeck,
                  slots: originalSlots,
                  meta: originalMetaStr,
                },
              },
            },
          });
          throw err;
        }
      }

      // Original logic for new draft mode
      // Combine signature cards and picked cards
      const slots: Record<string, number> = {
        ...draft.signatureCards,
        ...draft.pickedCards,
      };

      // Create deck meta with parallel front/back selections, card pool, sealed deck, and selections
      // investigatorCode is the base investigator code from the URL
      const meta: Record<string, string | null | boolean> = {};

      // Only set alternate_front if it's different from the base investigator
      if (draft.investigatorFrontCode !== draft.investigatorCode) {
        meta.alternate_front = draft.investigatorFrontCode;
      }

      // Only set alternate_back if it's different from the base investigator
      if (draft.investigatorBackCode !== draft.investigatorCode) {
        meta.alternate_back = draft.investigatorBackCode;
      }

      // Include card pool if set (null means explicitly cleared, undefined means use default)
      if (draft.cardPool && draft.cardPool.length > 0) {
        meta.card_pool = encodeCardPool(draft.cardPool);
      }

      // Include sealed deck if set
      if (draft.sealed) {
        Object.assign(meta, encodeSealedDeck(draft.sealed));
      }

      // Include selections if set (selections are stored directly in meta with their keys)
      if (draft.selections && Object.keys(draft.selections).length > 0) {
        for (const [key, value] of Object.entries(draft.selections)) {
          meta[key as keyof typeof meta] = value;
        }
      }

      // Mark this deck as created via draft
      meta.is_draft = true;

      // Create the deck
      // Use base investigator code, with parallel selections stored in meta
      let deck = createDeck({
        investigator_code: draft.investigatorCode,
        investigator_name: investigator.card.real_name,
        name:
          draft.title || `${displayAttribute(investigator.card, "name")} Draft`,
        slots,
        meta: JSON.stringify(meta),
        taboo_id: draft.tabooSetId ?? null,
        problem: null,
      });

      // Resolve the deck
      const resolved = resolveDeck(
        {
          lookupTables,
          metadata,
          sharing: state.sharing,
        },
        collator,
        deck,
      );

      // Handle fan-made content if present
      if (resolved.fanMadeData) {
        const meta = JSON.parse(deck.meta || "{}");
        meta.fan_made_content = resolved.fanMadeData;
        deck.meta = JSON.stringify(meta);
      }

      // Handle provider-specific saving
      if (draft.provider === "arkhamdb") {
        assertCanPublishDeck(resolved);

        setRemoting("arkhamdb", true);

        try {
          const adapter = new syncAdapters["arkhamdb"](useStore.getState);
          const { id } = await newDeck(state.app.clientId, adapter.out(deck));

          deck = adapter.in(
            await updateDeck(state.app.clientId, adapter.out({ ...deck, id })),
          );
        } catch (err) {
          disconnectProviderIfUnauthorized("arkhamdb", err, useStore.setState);
          throw err;
        } finally {
          setRemoting("arkhamdb", false);
        }
      }

      // Save to local storage
      useStore.setState({
        data: {
          ...state.data,
          decks: {
            ...state.data.decks,
            [deck.id]: deck,
          },
          history: {
            ...state.data.history,
            [deck.id]: [],
          },
        },
      });

      // Handle shared provider
      if (draft.provider === "shared") {
        await createShare(deck.id as string);
      }

      // Persist state
      await dehydrate(state, "app");

      toast.dismiss(toastId);
      resetDraft();
      navigate(`/deck/edit/${deck.id}`, { replace: true });
    } catch (err) {
      toast.dismiss(toastId);
      toast.show({
        children: t("deck_create.error", { error: (err as Error).message }),
        variant: "error",
      });
    }
  }, [
    draft,
    investigator,
    toast,
    t,
    resetDraft,
    navigate,
    createShare,
    setRemoting,
    upgradeDeck,
  ]);

  const phase = draft.phase;

  if (phase === "setup") {
    return (
      <div
        className={cx(css["layout"], css["layout-draft-setup"], "fade-in")}
        style={accentColor}
      >
        <Masthead className={css["layout-header"]} />
        <div className={css["layout-sidebar"]}>
          <DraftSetupEditor
            investigator={investigator}
            back={back}
            onStart={handleStart}
          />
        </div>
        <div className={css["layout-content"]}>
          <DraftSetupInvestigator />
        </div>
        <div className={css["layout-selections"]}>
          <DraftCardSets />
        </div>
        <footer className={css["layout-footer"]}>
          <Footer />
        </footer>
      </div>
    );
  }

  return (
    <div
      className={cx(css["layout"], css["layout-draft-picking"])}
      style={accentColor}
    >
      <Masthead className={css["layout-header"]} />

      <div className={css["layout-sidebar"]}>
        <DraftEditor
          resolvedDeck={resolvedDraftDeck}
          pickedCards={draft.pickedCards}
          signatureCards={draft.signatureCards}
          currentCount={currentDeckSize}
          targetCount={draft.targetDeckSize}
          title={draft.title}
        />
      </div>

      <div className={css["layout-content"]}>
        {phase === "picking" && (
          <DraftPicker
            options={draft.currentOptions}
            onPick={handlePick}
            onPickCustomization={pickDraftCustomization}
          />
        )}

        {phase === "complete" && (
          <div className={css["complete-container"]}>
            <div className="longform">
              <h2>{t("deck_draft.complete.title")}</h2>
              <p>
                {t("deck_draft.picking.progress", {
                  current: currentDeckSize,
                  target: draft.targetDeckSize,
                })}
              </p>
            </div>

            <div className={css["complete-actions"]}>
              <Button variant="primary" size="lg" onClick={handleSave}>
                <CheckIcon />
                {t("deck_draft.complete.save")}
              </Button>
              <Button variant="bare" size="lg" onClick={handleRestart}>
                <RotateCcwIcon />
                {t("deck_draft.complete.restart")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <footer className={css["layout-footer"]}>
        <Footer />
      </footer>
    </div>
  );
}

function DraftSetupInvestigator() {
  const { back, front } = useStore(selectDraftInvestigators);
  const setInvestigatorCode = useStore(
    (state) => state.draftSetInvestigatorCode,
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

function DraftCardSets() {
  const cardSets = useStore(selectDraftCardSets);
  const { investigator } = useStore(selectDraftInvestigators);
  const toggleCardSet = useStore((state) => state.draftToggleCardSet);
  const cssVariables = useAccentColor(investigator.card);

  const onCheckedChange = useCallback(
    (id: string) => {
      toggleCardSet(id);
    },
    [toggleCardSet],
  );

  return (
    <div className={css["card-selections"]} style={cssVariables}>
      {cardSets.map((set) =>
        set.cards.length ? (
          <CardSet key={set.id} onSelect={onCheckedChange} set={set} />
        ) : null,
      )}
    </div>
  );
}

export default DeckDraft;
