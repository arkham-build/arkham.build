import type { DecklistConfig } from "@arkham-build/shared";
import { type Card, countExperience } from "@arkham-build/shared";
import {
  LayoutGridIcon,
  LayoutListIcon,
  ListChecksIcon,
  SortDescIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { countGroupRows, type DeckGrouping } from "@/store/lib/deck-grouping";
import { sortPresetId } from "@/store/lib/list-display";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectDeckGroups } from "@/store/selectors/decks";
import type { ViewMode } from "@/store/slices/lists.types";
import { DEFAULT_LIST_SORT_ID } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
import { useHotkey } from "@/utils/use-hotkey";
import { AnnotationIndicator } from "../annotation-indicator";
import { Attachments } from "../attachments/attachments";
import { getMatchingAttachables } from "../attachments/attachments.helpers";
import { AllAttachables } from "../deck-tools/all-attachables";
import { LimitedSlots } from "../deck-tools/limited-slots";
import { SortSelect } from "../sort-select";
import { Button } from "../ui/button";
import { DropdownMenu } from "../ui/dropdown-menu";
import { HotkeyTooltip } from "../ui/hotkey";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useTabUrlState } from "../ui/tabs.hooks";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import css from "./decklist.module.css";
import { DecklistGroup } from "./decklist-groups";
import { DecklistSection } from "./decklist-section";

type Props = {
  className?: string;
  deck: ResolvedDeck;
  enableChecklistMode?: boolean;
};

export function Decklist(props: Props) {
  const { className, deck, enableChecklistMode } = props;
  const { t } = useTranslation();

  const settings = useStore((state) => state.settings);

  const [viewMode, setViewMode] = useTabUrlState<ViewMode>(
    "compact",
    "viewMode",
  );

  const [displayConfigId, setDisplayConfigId] = useState(DEFAULT_LIST_SORT_ID);
  const [checklistMode, setChecklistMode] = useState(false);
  const [checkedCardQuantities, setCheckedCardQuantities] = useState<
    ReadonlyMap<string, number>
  >(() => new Map());

  const [displayConfig, setDisplayConfig] = useState<DecklistConfig>(
    viewMode === "scans" ? settings.lists.deckScans : settings.lists.deck,
  );

  const groups = useStore(
    useShallow((state) => selectDeckGroups(state, deck, displayConfig)),
  );

  const setCardModalConfig = useStore((state) => state.setCardModalConfig);

  useEffect(() => {
    const listOrder = Object.values(groups).flatMap((g) =>
      g.data.flatMap((group) => group.cards.map((c) => c.code)),
    );

    setCardModalConfig({ listOrder });

    return () => {
      setCardModalConfig({ listOrder: undefined });
    };
  }, [groups, setCardModalConfig]);

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
      if (mode) {
        setViewMode(mode);
        if (displayConfigId === DEFAULT_LIST_SORT_ID) {
          setDisplayConfigId(DEFAULT_LIST_SORT_ID);
          setDisplayConfig(
            mode === "scans" ? settings.lists.deckScans : settings.lists.deck,
          );
        }
      }
    },
    [
      setViewMode,
      settings.lists.deck,
      settings.lists.deckScans,
      displayConfigId,
    ],
  );

  const onSetListConfig = useCallback(
    (config: DecklistConfig | undefined) => {
      if (config) {
        setDisplayConfigId(sortPresetId(config));
        setDisplayConfig(config);
      } else {
        setDisplayConfigId(DEFAULT_LIST_SORT_ID);
        setDisplayConfig(
          viewMode === "scans" ? settings.lists.deckScans : settings.lists.deck,
        );
      }
    },
    [settings.lists.deck, settings.lists.deckScans, viewMode],
  );

  const onChecklistModeChange = useCallback((value: string) => {
    setChecklistMode(value === "checklist");
  }, []);

  const onChecklistClear = useCallback(() => {
    setCheckedCardQuantities(new Map());
  }, []);

  const onCardCheckedQuantityChange = useCallback(
    (cardKey: string, quantity: number) => {
      setCheckedCardQuantities((current) => {
        const next = new Map(current);

        if (quantity > 0) {
          next.set(cardKey, quantity);
        } else {
          next.delete(cardKey);
        }

        return next;
      });
    },
    [],
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
  useHotkey("alt+l", () => onSetViewMode("compact"));

  return (
    <article className={cx(css["decklist-container"], className)}>
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
            <ToggleGroupItem value="compact">
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
        <Popover placement="bottom-start">
          <PopoverTrigger asChild>
            <Button iconOnly size="sm" variant="bare">
              <SortDescIcon /> {t("lists.nav.sort")}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <DropdownMenu>
              <SortSelect
                selectedId={displayConfigId}
                onConfigChange={onSetListConfig}
              />
            </DropdownMenu>
          </PopoverContent>
        </Popover>
        {enableChecklistMode && (
          <>
            <ToggleGroup
              type="single"
              value={checklistMode ? "checklist" : ""}
              onValueChange={onChecklistModeChange}
            >
              <ToggleGroupItem
                className={css["checklist-toggle"]}
                value="checklist"
              >
                <ListChecksIcon /> {t("deck_view.checklist")}
              </ToggleGroupItem>
            </ToggleGroup>
            {checklistMode && checkedCardQuantities.size > 0 && (
              <Button onClick={onChecklistClear} size="xs" variant="bare">
                {t("common.clear")}
              </Button>
            )}
          </>
        )}
      </nav>

      <div className={css["decklist"]} data-testid="view-decklist">
        {groups.slots && (
          <DecklistSection
            size={Object.keys(deck.slots).length}
            title={labels["slots"]}
            columns={getColumnMode(viewMode as ViewMode, groups.slots)}
          >
            <DecklistGroup
              checkedCardQuantities={
                checklistMode ? checkedCardQuantities : undefined
              }
              deck={deck}
              grouping={groups.slots}
              getListCardProps={getListCardProps}
              onCardCheckedQuantityChange={onCardCheckedQuantityChange}
              viewMode={viewMode as ViewMode}
            />
          </DecklistSection>
        )}

        {hasAdditional && (
          <div className={css["decklist-additional"]}>
            {groups.sideSlots && (
              <DecklistSection
                columns={getColumnMode(viewMode as ViewMode, groups.sideSlots)}
                showTitle
                title={labels["sideSlots"]}
                extraInfos={`${computeXPSum(deck, "sideSlots")} ${t("common.xp")}`}
              >
                <DecklistGroup
                  checkedCardQuantities={
                    checklistMode ? checkedCardQuantities : undefined
                  }
                  deck={deck}
                  grouping={groups.sideSlots}
                  getListCardProps={getListCardProps}
                  onCardCheckedQuantityChange={onCardCheckedQuantityChange}
                  viewMode={viewMode as ViewMode}
                  showXP
                />
              </DecklistSection>
            )}
            {groups.bondedSlots && (
              <DecklistSection
                columns={getColumnMode(
                  viewMode as ViewMode,
                  groups.bondedSlots,
                )}
                title={labels["bondedSlots"]}
                showTitle
              >
                <DecklistGroup
                  checkedCardQuantities={
                    checklistMode ? checkedCardQuantities : undefined
                  }
                  deck={deck}
                  grouping={groups.bondedSlots}
                  getListCardProps={getListCardProps}
                  onCardCheckedQuantityChange={onCardCheckedQuantityChange}
                  viewMode={viewMode as ViewMode}
                />
              </DecklistSection>
            )}

            {groups.extraSlots && (
              <DecklistSection
                columns={getColumnMode(viewMode as ViewMode, groups.extraSlots)}
                title={labels["extraSlots"]}
                showTitle
              >
                <DecklistGroup
                  checkedCardQuantities={
                    checklistMode ? checkedCardQuantities : undefined
                  }
                  deck={deck}
                  grouping={groups.extraSlots}
                  getListCardProps={getListCardProps}
                  onCardCheckedQuantityChange={onCardCheckedQuantityChange}
                  viewMode={viewMode as ViewMode}
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
