import type { FilteredListCardPropsGetter } from "@/components/card-list/types";
import { DeckStats } from "@/components/deck-stats";
import { DecklistGroup } from "@/components/decklist/decklist-groups";
import { DecklistSection } from "@/components/decklist/decklist-section";
import { Scroller } from "@/components/ui/scroller";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/store";
import type { DeckGrouping } from "@/store/lib/deck-grouping";
import type { DeckValidationResult } from "@/store/lib/deck-validation";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectDeckGroups } from "@/store/selectors/decks";
import type { ViewMode } from "@/store/slices/lists.types";
import { getCardColor } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
import { useAccentColor } from "@/utils/use-accent-color";
import { useResolvedDeckChecked } from "@/utils/use-resolved-deck";
import { useTranslation } from "react-i18next";
import { EditorActions } from "./editor-actions";
import css from "./editor.module.css";
import { InvestigatorListcard } from "./investigator-listcard";
import { MetaEditor } from "./meta-editor";

type TabDefinition = {
  value: string;
  label: string;
  hotkey: string;
  hotkeyLabel: string;
};

type Props = {
  className?: string;
  currentTab: string;
  tabs: TabDefinition[];
  currentTool: string;
  onTabChange: (tab: string) => void;
  getListCardProps?: FilteredListCardPropsGetter;
  validation?: DeckValidationResult;
  viewMode?: ViewMode;
};

export function Editor(props: Props) {
  const { currentTab, getListCardProps, onTabChange, tabs } = props;

  const { resolvedDeck: deck } = useResolvedDeckChecked();
  const { t } = useTranslation();

  const groups = useStore((state) => selectDeckGroups(state, deck, "list"));

  const cssVariables = useAccentColor(deck.investigatorBack.card.faction_code);
  const backgroundCls = getCardColor(deck.investigatorBack.card, "background");

  return (
    <div className={css["editor"]} style={cssVariables} data-testid="editor">
      <header className={cx(css["editor-header"], backgroundCls)}>
        <h1 className={css["editor-title"]}>{deck.name}</h1>
        <DeckStats deck={deck} />
      </header>

      <InvestigatorListcard deck={deck} />

      <Tabs
        className={css["editor-tabs"]}
        onValueChange={(value: string) => {
          onTabChange(value);
        }}
        value={currentTab}
      >
        <TabsList className={css["editor-tabs-list"]}>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              data-testid={`editor-tab-${tab.value.toLowerCase()}`}
              value={tab.value}
              hotkey={tab.hotkey}
              tooltip={tab.hotkeyLabel}
            >
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <Scroller className={css["editor-tabs-content"]}>
          <TabsContent value="slots" data-testid="editor-tabs-slots">
            <EditorGroup
              deck={deck}
              getListCardProps={getListCardProps}
              grouping={groups.slots}
              title={t("common.decks.slots")}
            />

            <EditorGroup
              deck={deck}
              grouping={groups.bondedSlots}
              getListCardProps={getListCardProps}
              omitEmpty
              showTitle
              title={t("common.decks.bondedSlots")}
            />
          </TabsContent>

          <TabsContent value="sideSlots">
            <EditorGroup
              deck={deck}
              grouping={groups.sideSlots}
              getListCardProps={getListCardProps}
              title={t("common.decks.sideSlots")}
              showXP
            />
          </TabsContent>

          {deck.hasExtraDeck && (
            <TabsContent value="extraSlots">
              <EditorGroup
                grouping={groups.extraSlots}
                title="Spirit deck"
                getListCardProps={getListCardProps}
                deck={deck}
              />
            </TabsContent>
          )}

          <TabsContent value="config">
            <MetaEditor deck={deck} />
          </TabsContent>
        </Scroller>
        <EditorActions currentTab={currentTab} deck={deck} />
      </Tabs>
    </div>
  );
}

function EditorGroup(props: {
  deck: ResolvedDeck;
  title: string;
  showTitle?: boolean;
  getListCardProps?: FilteredListCardPropsGetter;
  omitEmpty?: boolean;
  grouping?: DeckGrouping;
  showXP?: boolean;
}) {
  const { deck, omitEmpty, grouping, getListCardProps, showTitle, title } =
    props;

  const empty = isEmpty(grouping?.data);

  if (omitEmpty && empty) return null;

  return (
    <DecklistSection showTitle={showTitle} title={title}>
      {empty ? (
        <Placeholder />
      ) : (
        <DecklistGroup
          getListCardProps={getListCardProps}
          grouping={grouping}
          deck={deck}
          showXP={props.showXP}
        />
      )}
    </DecklistSection>
  );
}

function Placeholder() {
  const { t } = useTranslation();
  return (
    <div className={css["editor-placeholder"]}>{t("common.no_entries")}</div>
  );
}
