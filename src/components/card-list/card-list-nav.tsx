import { CardlistCount } from "@/components/card-list/card-list-count";
import { NONE, getGroupingKeyLabel } from "@/store/lib/grouping";
import type { ResolvedDeck } from "@/store/lib/types";
import type { ListState } from "@/store/selectors/lists";
import type { ViewMode } from "@/store/slices/lists.types";
import type { Metadata } from "@/store/slices/metadata.types";
import { useHotkey } from "@/utils/use-hotkey";
import { SlidersVerticalIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  LimitedCardPoolTag,
  SealedDeckTag,
} from "../limited-card-pool/limited-card-pool";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuSection,
  DropdownRadioGroupItem,
} from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RadioGroup } from "../ui/radio-group";
import { Select } from "../ui/select";
import css from "./card-list-nav.module.css";

type Props = {
  data: ListState | undefined;
  deck?: ResolvedDeck;
  metadata: Metadata;
  onSelectGroup: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
  viewMode: ViewMode;
};

export function CardListNav(props: Props) {
  const { data, metadata, onSelectGroup, onViewModeChange, viewMode } = props;
  const { t } = useTranslation();

  const jumpToOptions = useMemo(
    () =>
      data?.groups.map((group, i) => {
        const count = data.groupCounts[i];

        const keys = group.key.split("|");
        const types = group.type.split("|");
        const isAsset = group.key.includes("asset");

        const groupLabel = keys
          .map((key, i) => {
            if (!isAsset && key === NONE) return null;
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
    [data, metadata],
  );

  // TECH DEBT: option names and display names have diverted, reconcile.
  const onToggleList = useCallback(() => {
    onViewModeChange("compact");
  }, [onViewModeChange]);

  const onToggleCardText = useCallback(() => {
    onViewModeChange("card-text");
  }, [onViewModeChange]);

  const onToggleFullCards = useCallback(() => {
    onViewModeChange("full-cards");
  }, [onViewModeChange]);

  const onToggleScans = useCallback(() => {
    onViewModeChange("scans");
  }, [onViewModeChange]);

  useHotkey("alt+l", onToggleList);
  useHotkey("alt+shift+l", onToggleCardText);
  useHotkey("alt+d", onToggleFullCards);
  useHotkey("alt+s", onToggleScans);

  if (data == null) return null;

  return (
    <nav className={css["nav"]}>
      <output className={css["nav-stats"]}>
        <LimitedCardPoolTag />
        <SealedDeckTag />
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
              <DropdownMenuSection title={t("lists.nav.display")}>
                <RadioGroup value={viewMode} onValueChange={onViewModeChange}>
                  <DropdownRadioGroupItem hotkey="alt+l" value="compact">
                    {t("lists.nav.display_as_list")}
                  </DropdownRadioGroupItem>
                  <DropdownRadioGroupItem
                    hotkey="alt+shift+l"
                    value="card-text"
                  >
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
            </DropdownMenu>
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}
