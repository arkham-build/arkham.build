import { SlidersVerticalIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CardlistCount } from "@/components/card-list/card-list-count";
import { useStore } from "@/store";
import { getGroupingKeyLabel, NONE } from "@/store/lib/grouping";
import type { ResolvedDeck } from "@/store/lib/types";
import type { ListState } from "@/store/selectors/lists";
import { selectActiveList } from "@/store/selectors/shared";
import type { ViewMode } from "@/store/slices/lists.types";
import type { Metadata } from "@/store/slices/metadata.types";
import { DEFAULT_LIST_SORT_ID } from "@/utils/constants";
import { useHotkey } from "@/utils/use-hotkey";
import { useResolvedDeck } from "@/utils/use-resolved-deck";
import {
  DeckTagsContainer,
  LimitedCardPoolTag,
  SealedDeckTag,
} from "../deck-tags/deck-tags";
import { SortSelect } from "../sort-select";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuSection,
  DropdownRadioGroupItem,
} from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RadioGroup } from "../ui/radio-group";
import { Scroller } from "../ui/scroller";
import { Select } from "../ui/select";
import css from "./card-list-nav.module.css";

type Props = {
  data: ListState | undefined;
  deck?: ResolvedDeck;
  metadata: Metadata;
  onSelectGroup: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
  viewMode: ViewMode;
};

export function CardListNav(props: Props) {
  const { data, metadata, onSelectGroup } = props;
  const { t } = useTranslation();

  const { resolvedDeck: deck } = useResolvedDeck();

  const hasAssetGroup = data?.groups.some((group) =>
    group.key.includes("asset"),
  );

  const jumpToOptions = useMemo(
    () =>
      data?.groups.map((group, i) => {
        const count = data.groupCounts[i];

        const keys = group.key.split("|");
        const types = group.type.split("|");
        const isAsset = group.key.includes("asset");

        const groupLabel = keys
          .map((key, i) => {
            if (hasAssetGroup && !isAsset && key === NONE) return null;
            const label = getGroupingKeyLabel(types[i], key, metadata);
            return label;
          })
          .filter(Boolean)
          .join(" · ");

        return {
          label: `${groupLabel} (${count})`,
          value: group.key,
        };
      }),
    [data, metadata, hasAssetGroup],
  );

  if (data == null) return null;

  return (
    <nav className={css["nav"]}>
      <output className={css["nav-stats"]}>
        {!!deck && (
          <DeckTagsContainer>
            <LimitedCardPoolTag deck={deck} />
            <SealedDeckTag deck={deck} />
          </DeckTagsContainer>
        )}
        <CardlistCount data={data} />
      </output>
      <div className={css["nav-row"]}>
        {data && (
          <Select
            className={css["nav-jump"]}
            emptyLabel={t("lists.nav.jump_to")}
            onChange={onSelectGroup}
            options={jumpToOptions ?? []}
            variant="compressed"
            value=""
          />
        )}
        <DisplaySettings viewMode={props.viewMode} />
      </div>
    </nav>
  );
}

function DisplaySettings({ viewMode }: { viewMode: ViewMode }) {
  const { t } = useTranslation();

  const setListViewMode = useStore((state) => state.setListViewMode);

  const sortSelection = useStore(
    (state) => selectActiveList(state)?.displaySortSelection,
  );

  const setListSort = useStore((state) => state.setListSort);

  // TECH DEBT: option names and display names have diverted, reconcile.
  const onToggleList = useCallback(() => {
    setListViewMode("compact");
  }, [setListViewMode]);

  const onToggleCardText = useCallback(() => {
    setListViewMode("card-text");
  }, [setListViewMode]);

  const onToggleFullCards = useCallback(() => {
    setListViewMode("full-cards");
  }, [setListViewMode]);

  const onToggleScans = useCallback(() => {
    setListViewMode("scans");
  }, [setListViewMode]);

  useHotkey("alt+l", onToggleList);
  useHotkey("alt+shift+l", onToggleCardText);
  useHotkey("alt+d", onToggleFullCards);
  useHotkey("alt+s", onToggleScans);

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger asChild>
        <Button
          className={css["nav-config"]}
          tooltip={t("lists.nav.list_settings")}
          data-test-id="card-list-config"
          variant="bare"
          iconOnly
          size="lg"
        >
          <SlidersVerticalIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <DropdownMenu>
          <Scroller className={css["nav-popover"]}>
            <DropdownMenuSection title={t("lists.nav.display")}>
              <RadioGroup value={viewMode} onValueChange={setListViewMode}>
                <DropdownRadioGroupItem hotkey="alt+l" value="compact">
                  {t("lists.nav.display_as_list")}
                </DropdownRadioGroupItem>
                <DropdownRadioGroupItem hotkey="alt+shift+l" value="card-text">
                  {t("lists.nav.display_as_list_text")}
                </DropdownRadioGroupItem>
                <DropdownRadioGroupItem hotkey="alt+d" value="full-cards">
                  {t("lists.nav.display_as_detailed")}
                </DropdownRadioGroupItem>
                <DropdownRadioGroupItem hotkey="alt+s" value="scans">
                  {t("lists.nav.display_as_scans")}
                </DropdownRadioGroupItem>
              </RadioGroup>
            </DropdownMenuSection>
            <DropdownMenuSection title={t("lists.nav.sort")}>
              <SortSelect
                selectedId={sortSelection ?? DEFAULT_LIST_SORT_ID}
                onConfigChange={setListSort}
              />
            </DropdownMenuSection>
          </Scroller>
        </DropdownMenu>
      </PopoverContent>
    </Popover>
  );
}
