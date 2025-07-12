import { LayoutGridIcon, LayoutListIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { countGroupRows, type DeckGrouping } from "@/store/lib/deck-grouping";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Card } from "@/store/schemas/card.schema";
import { selectDeckGroups } from "@/store/selectors/decks";
import { countExperience } from "@/utils/card-utils";
import { isEmpty } from "@/utils/is-empty";
import { useHotkey } from "@/utils/use-hotkey";
import { AnnotationIndicator } from "../annotation-indicator";
import { Attachments } from "../attachments/attachments";
import { getMatchingAttachables } from "../attachments/attachments.helpers";
import { AllAttachables } from "../deck-tools/all-attachables";
import { LimitedSlots } from "../deck-tools/limited-slots";
import { HotkeyTooltip } from "../ui/hotkey";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import css from "./decklist.module.css";
import type { ViewMode } from "./decklist.types";
import { DecklistGroup } from "./decklist-groups";
import { DecklistSection } from "./decklist-section";

type Props = {
  deck: ResolvedDeck;
  setViewMode: (mode: ViewMode) => void;
  viewMode: ViewMode;
};

export function Decklist(props: Props) {
  const { deck, setViewMode, viewMode } = props;
  const { t } = useTranslation();

  const groups = useStore((state) => selectDeckGroups(state, deck, viewMode));

  const renderCardExtra = useCallback(
    (card: Card) => {
      const isAttached = !isEmpty(getMatchingAttachables(card, deck));
      const annotation = deck.annotations[card.code];

      return !!annotation || isAttached ? (
        <>
          {isAttached && (
            <Attachments
              card={card}
              resolvedDeck={deck}
              buttonVariant={viewMode === "scans" ? "bare" : undefined}
            />
          )}
          {viewMode === "scans" && annotation && <AnnotationIndicator />}
        </>
      ) : null;
    },
    [deck, viewMode],
  );

  const getListCardProps = useCallback(
    () => ({ renderCardExtra }),
    [renderCardExtra],
  );

  const hasAdditional =
    groups.bondedSlots || groups.extraSlots || groups.sideSlots;

  const onSetViewMode = useCallback(
    (mode: ViewMode) => {
      if (mode) setViewMode(mode as ViewMode);
    },
    [setViewMode],
  );

  const labels = useMemo(
    () => ({
      slots: t("common.decks.slots"),
      sideSlots: t("common.decks.sideSlots"),
      bondedSlots: t("common.decks.bondedSlots"),
      extraSlots: t("common.decks.extraSlots"),
    }),
    [t],
  );

  useHotkey("alt+s", () => onSetViewMode("scans"));
  useHotkey("alt+l", () => onSetViewMode("list"));

  return (
    <article className={css["decklist-container"]}>
      <nav className={css["decklist-nav"]}>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={onSetViewMode}
        >
          <HotkeyTooltip
            keybind="alt+l"
            description={t("deck_view.actions.display_as_list")}
          >
            <ToggleGroupItem value="list">
              <LayoutListIcon /> {t("deck_view.list")}
            </ToggleGroupItem>
          </HotkeyTooltip>
          <HotkeyTooltip
            keybind="alt+s"
            description={t("deck_view.actions.display_as_scans")}
          >
            <ToggleGroupItem value="scans">
              <LayoutGridIcon /> {t("deck_view.scans")}
            </ToggleGroupItem>
          </HotkeyTooltip>
        </ToggleGroup>
      </nav>

      <div className={css["decklist"]} data-testid="view-decklist">
        {groups.slots && (
          <DecklistSection
            title={labels["slots"]}
            columns={getColumnMode(viewMode, groups.slots)}
          >
            <DecklistGroup
              deck={deck}
              grouping={groups.slots}
              getListCardProps={getListCardProps}
              viewMode={viewMode}
            />
          </DecklistSection>
        )}

        {hasAdditional && (
          <div className={css["decklist-additional"]}>
            {groups.sideSlots && (
              <DecklistSection
                columns={getColumnMode(viewMode, groups.sideSlots)}
                showTitle
                title={labels["sideSlots"]}
                extraInfos={`${computeXPSum(deck, "sideSlots")} ${t("common.xp")}`}
              >
                <DecklistGroup
                  deck={deck}
                  grouping={groups.sideSlots}
                  getListCardProps={getListCardProps}
                  viewMode={viewMode}
                  showXP
                />
              </DecklistSection>
            )}
            {groups.bondedSlots && (
              <DecklistSection
                columns={getColumnMode(viewMode, groups.bondedSlots)}
                title={labels["bondedSlots"]}
                showTitle
              >
                <DecklistGroup
                  deck={deck}
                  grouping={groups.bondedSlots}
                  getListCardProps={getListCardProps}
                  viewMode={viewMode}
                />
              </DecklistSection>
            )}

            {groups.extraSlots && (
              <DecklistSection
                columns={getColumnMode(viewMode, groups.extraSlots)}
                title={labels["extraSlots"]}
                showTitle
              >
                <DecklistGroup
                  deck={deck}
                  grouping={groups.extraSlots}
                  getListCardProps={getListCardProps}
                  viewMode={viewMode}
                />
              </DecklistSection>
            )}
          </div>
        )}

        <div className={css["decklist-tools"]}>
          <LimitedSlots deck={deck} />
          <AllAttachables deck={deck} readonly />
        </div>
      </div>
    </article>
  );
}

function getColumnMode(viewMode: ViewMode, group: DeckGrouping) {
  if (viewMode === "scans") return "scans";
  return countGroupRows(group) < 5 ? "single" : "auto";
}

function computeXPSum(deck: ResolvedDeck, slotKey: "sideSlots" | "slots") {
  if (!deck[slotKey]) return 0;

  return Object.entries(deck[slotKey]).reduce((acc, [code, quantity]) => {
    const card = deck.cards[slotKey][code]?.card;

    return acc + (card ? countExperience(card, quantity) : 0);
  }, 0);
}
