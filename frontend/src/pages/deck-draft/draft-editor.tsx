import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DecklistGroup } from "@/components/decklist/decklist-groups";
import { DecklistSection } from "@/components/decklist/decklist-section";
import { Scroller } from "@/components/ui/scroller";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestigatorListcard } from "@/pages/deck-edit/editor/investigator-listcard";
import { useStore } from "@/store";
import type { DeckGrouping } from "@/store/lib/deck-grouping";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectDeckGroups } from "@/store/selectors/decks";
import { selectMetadata } from "@/store/selectors/shared";
import { getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { useAccentColor } from "@/utils/use-accent-color";
import css from "./draft-editor.module.css";

type Props = {
  resolvedDeck: ResolvedDeck;
  pickedCards: Record<string, number>;
  signatureCards: Record<string, number>;
  currentCount: number;
  targetCount: number;
  title: string;
};

export function DraftEditor(props: Props) {
  const { resolvedDeck, pickedCards, signatureCards, title } = props;
  const { t } = useTranslation();

  const metadata = useStore(selectMetadata);
  const settings = useStore((state) => state.settings);

  // Calculate deck stats manually for draft
  const deckStats = useMemo(() => {
    let deckSize = 0;
    let deckSizeTotal = 0;

    for (const [code, quantity] of Object.entries(pickedCards)) {
      const card = metadata.cards[code];
      if (card) {
        deckSizeTotal += quantity;
        if (
          !card.encounter_code &&
          !card.subtype_code &&
          card.xp != null &&
          !card.permanent
        ) {
          deckSize += quantity;
        }
      }
    }

    // Add signature cards to total but not to deck size
    for (const [code, quantity] of Object.entries(signatureCards)) {
      const card = metadata.cards[code];
      if (card) {
        deckSizeTotal += quantity;
      }
    }

    return {
      deckSize,
      deckSizeTotal,
      xpRequired: 0,
    };
  }, [pickedCards, signatureCards, metadata]);

  // Create a modified ResolvedDeck with draft stats
  const draftDeckWithStats = useMemo((): ResolvedDeck => {
    return {
      ...resolvedDeck,
      stats: {
        ...resolvedDeck.stats,
        deckSize: deckStats.deckSize,
        deckSizeTotal: deckStats.deckSizeTotal,
        xpRequired: 0,
      },
    };
  }, [resolvedDeck, deckStats]);

  // Calculate accent colors
  const cardForAccent = draftDeckWithStats.investigatorBack.card;
  const cssVariables = useAccentColor(cardForAccent);
  const backgroundCls = getCardColor(
    draftDeckWithStats.investigatorBack.card,
    "background",
  );

  // Get deck groups for display
  const groups = useStore((state) =>
    selectDeckGroups(state, draftDeckWithStats, settings.lists.deck),
  );

  return (
    <div className={css["editor"]} style={cssVariables} data-testid="editor">
      <header className={cx(css["editor-header"], backgroundCls)}>
        <h1 className={css["editor-title"]}>{title}</h1>
        <DraftStats
          deckSize={deckStats.deckSize}
          deckSizeTotal={deckStats.deckSizeTotal}
        />
      </header>

      <InvestigatorListcard deck={draftDeckWithStats} />

      <Tabs className={css["editor-tabs"]} value="slots">
        <TabsList className={css["editor-tabs-list"]}>
          <TabsTrigger value="slots">
            <span>{t("common.decks.slots")}</span>
          </TabsTrigger>
        </TabsList>

        <Scroller className={css["editor-tabs-content"]}>
          <TabsContent value="slots" data-testid="editor-tabs-slots">
            <EditorGroup
              deck={draftDeckWithStats}
              grouping={groups?.slots}
              title={t("common.decks.slots")}
            />

            {groups?.bondedSlots && (
              <EditorGroup
                deck={draftDeckWithStats}
                grouping={groups.bondedSlots}
                omitEmpty
                showTitle
                title={t("common.decks.bondedSlots")}
              />
            )}
          </TabsContent>
        </Scroller>
      </Tabs>
    </div>
  );
}

function DraftStats(props: { deckSize: number; deckSizeTotal: number }) {
  const { deckSize, deckSizeTotal } = props;

  return (
    <div className={css["stats"]}>
      <strong data-testid="deck-summary-size">
        <i className="icon-card-outline-bold" />× {deckSize} ({deckSizeTotal})
      </strong>
    </div>
  );
}

function EditorGroup(props: {
  deck: ResolvedDeck;
  title: string;
  showTitle?: boolean;
  grouping?: DeckGrouping;
  omitEmpty?: boolean;
}) {
  const { deck, omitEmpty, grouping, showTitle, title } = props;

  const { t } = useTranslation();
  const isEmpty = !grouping?.data?.length;

  if (omitEmpty && isEmpty) return null;

  return (
    <DecklistSection showTitle={showTitle} title={title}>
      {isEmpty ? (
        <div className={css["editor-placeholder"]}>
          {t("common.no_entries")}
        </div>
      ) : (
        grouping && <DecklistGroup deck={deck} grouping={grouping} />
      )}
    </DecklistSection>
  );
}
