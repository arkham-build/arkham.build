import type { Card, CustomizationOption } from "@arkham-build/shared";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CardScanControlled } from "@/components/card-scan";
import { CustomizableSheet } from "@/components/customizable-sheet";
import css from "@/components/customizations/customizations.module.css";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/store";
import { encodeCustomizations } from "@/store/lib/deck-meta";
import { resolveDeck } from "@/store/lib/resolve-deck";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import {
  cardLimit,
  displayAttribute,
  parseCustomizationTextHtml,
} from "@/utils/card-utils";
import { range } from "@/utils/range";
import draftCss from "./deck-draft.module.css";

type Props = {
  card: Card;
  optionIndex: number;
  option: CustomizationOption;
  deck?: ResolvedDeck;
  onPick: () => void;
};

export function CustomizationUpgradeCard(props: Props) {
  const { card, optionIndex, option, deck: baseDeck, onPick } = props;
  const [imageError, setImageError] = useState(false);
  const { t } = useTranslation();

  const id = useId();
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const collator = useStore(selectLocaleSortingCollator);
  const draft = useStore((state) => state.draft);

  // Get customization text using displayAttribute
  const customizationText = displayAttribute(card, "customization_text")?.split(
    "\n",
  );
  const htmlText = customizationText?.[optionIndex] ?? "";

  const sharing = useStore((state) => state.sharing);

  // Check if a copy of the card will be added to the deck
  const willAddCardCopy = useMemo(() => {
    if (!draft) return false;
    const currentQuantity = draft.pickedCards[card.code] ?? 0;
    const limit = cardLimit(card);
    return currentQuantity < limit;
  }, [draft, card]);

  // Extract stable values from baseDeck for useMemo dependencies
  const baseDeckId = baseDeck?.id;
  const baseDeckCustomizations = baseDeck?.customizations;

  // Create a deck with this specific customization option applied for CustomizableSheet
  const deckWithCustomization = useMemo(() => {
    if (!baseDeck || !baseDeckId) return undefined;

    // Use getState directly to avoid function recreation on every render
    const state = useStore.getState();
    const originalDeck = state.data.decks[String(baseDeckId)];
    if (!originalDeck) return baseDeck;

    // Get existing customizations
    const existingCustomizations = baseDeckCustomizations ?? {};

    // Create customizations with this option fully upgraded
    const customizations = {
      ...existingCustomizations,
      [card.code]: {
        ...existingCustomizations[card.code],
        [optionIndex]: {
          index: optionIndex,
          xp_spent: option.xp,
        },
      },
    };

    // Encode and merge into meta
    const deckMeta = JSON.parse(originalDeck.meta || "{}");
    const encodedCustomizations = encodeCustomizations(customizations);
    const mergedMeta = {
      ...deckMeta,
      ...encodedCustomizations,
    };

    // Create temporary deck with merged meta
    const tempDeck = {
      ...originalDeck,
      meta: JSON.stringify(mergedMeta),
    };

    // Resolve the temporary deck
    return resolveDeck(
      {
        lookupTables,
        metadata,
        sharing,
      },
      collator,
      tempDeck,
    );
  }, [
    baseDeck,
    baseDeckId,
    baseDeckCustomizations,
    card.code,
    optionIndex,
    option.xp,
    lookupTables,
    metadata,
    collator,
    sharing,
  ]);

  // Use the actual XP for this option (not the max) for checkbox spacing
  const optionXp = option.xp ?? 0;

  const cssVariables = useMemo(
    () => ({
      "--customization-xp": optionXp,
    }),
    [optionXp],
  );

  // Try to use CustomizableSheet if we have a deck with customization, otherwise fall back to CardScanControlled
  const showCustomizableSheet = deckWithCustomization && !imageError;

  return (
    <div className={draftCss["customization-upgrade-wrapper"]}>
      <button
        type="button"
        className={draftCss["option-trigger"]}
        onClick={onPick}
      >
        <div className={draftCss["card-image-container"]}>
          {showCustomizableSheet ? (
            <div onError={() => setImageError(true)}>
              <CustomizableSheet
                card={card}
                deck={deckWithCustomization}
                disableModal
              />
            </div>
          ) : (
            <CardScanControlled
              card={card}
              flipped={false}
              hideFlipButton
              preventFlip
              draggable={false}
            />
          )}
        </div>
      </button>
      <button
        type="button"
        className={css["customization"]}
        style={cssVariables as React.CSSProperties}
        onClick={onPick}
      >
        <div className={css["checks"]}>
          {!!option.xp &&
            range(0, option.xp).map((i) => (
              <Checkbox
                checked={true}
                disabled
                hideLabel
                id={`${id}-${i}`}
                key={i}
                label=""
              />
            ))}
        </div>
        <div className={css["content"]}>
          {htmlText && (
            <p
              // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is from trusted source.
              dangerouslySetInnerHTML={{
                __html: parseCustomizationTextHtml(htmlText),
              }}
            />
          )}
        </div>
      </button>
      {willAddCardCopy && (
        <p className={draftCss["customization-helper-text"]}>
          {t("deck_draft.customization.will_add_card_copy")}
        </p>
      )}
    </div>
  );
}
