import { useStore } from "@/store";
import {
  selectActiveList,
  selectActiveListFilters,
} from "@/store/selectors/lists";
import { cx } from "@/utils/cx";
import { useHotkey } from "@/utils/use-hotkey";
import { useResolvedDeck } from "@/utils/use-resolved-deck";
import { FilterXIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Fragment } from "react/jsx-runtime";
import { PreviewBanner } from "../preview-banner";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { HotkeyTooltip } from "../ui/hotkey";
import { Scroller } from "../ui/scroller";
import { ActionFilter } from "./action-filter";
import { AssetFilter } from "./asset-filter";
import { CardTypeFilter } from "./card-type-filter";
import { CostFilter } from "./cost-filter";
import { EncounterSetFilter } from "./encounter-set-filter";
import { FactionFilter } from "./faction-filter";
import { FanMadeContentFilter } from "./fan-made-content-filter";
import css from "./filters.module.css";
import { HealthFilter } from "./health-filter";
import { IllustratorFilter } from "./illustrator-filter";
import { InvestigatorCardAccessFilter } from "./investigator-card-access-filter";
import { InvestigatorFilter } from "./investigator-filter";
import { InvestigatorSkillsFilter } from "./investigator-skills-filter";
import { LevelFilter } from "./level-filter";
import { OwnershipFilter } from "./ownership-filter";
import { PackFilter } from "./pack-filter";
import { PropertiesFilter } from "./properties-filter";
import { SanityFilter } from "./sanity-filter";
import { SkillIconsFilter } from "./skill-icons-filter";
import { SubtypeFilter } from "./subtype-filter";
import { TabooSetFilter } from "./taboo-set-filter";
import { TraitFilter } from "./trait-filter";
import { TypeFilter } from "./type-filter";

type Props = {
  children?: React.ReactNode;
  className?: string;
};

export function Filters(props: Props) {
  const { resolvedDeck } = useResolvedDeck();
  const { t } = useTranslation();

  const activeList = useStore(selectActiveList);
  const filters = useStore(selectActiveListFilters);

  const resetFilters = useStore((state) => state.resetFilters);
  const updateFiltersEnabled = useStore((state) => state.setFiltersEnabled);

  const filtersEnabled = activeList?.filtersEnabled ?? true;

  const toggleFiltersEnabled = useCallback(() => {
    updateFiltersEnabled(!filtersEnabled);
  }, [filtersEnabled, updateFiltersEnabled]);

  useHotkey;

  useHotkey("alt+f", toggleFiltersEnabled, {
    allowInputFocused: true,
  });

  useHotkey("alt+shift+f", resetFilters, {
    allowInputFocused: true,
  });

  return (
    <search
      className={cx(
        css["filters"],
        props.className,
        !filtersEnabled && css["disabled"],
      )}
    >
      {import.meta.env.VITE_SHOW_PREVIEW_BANNER === "true" && <PreviewBanner />}

      {props.children && (
        <div className={css["children"]}>{props.children}</div>
      )}

      {activeList?.key !== "create_deck" && (
        <CardTypeFilter className={css["card-type-filter"]} />
      )}

      <div className={css["header"]}>
        <HotkeyTooltip
          keybind="alt+f"
          description={t("lists.actions.toggle_filters")}
        >
          <Checkbox
            checked={filtersEnabled}
            id="toggle-filters"
            label={<h3 className={css["title"]}>{t("filters.title")}</h3>}
            onCheckedChange={updateFiltersEnabled}
          />
        </HotkeyTooltip>

        <HotkeyTooltip
          keybind="alt+shift+f"
          description={t("lists.actions.reset_filters")}
        >
          <Button
            disabled={!filtersEnabled}
            onClick={resetFilters}
            size="sm"
            variant="bare"
          >
            <FilterXIcon /> {t("common.reset")}
          </Button>
        </HotkeyTooltip>
      </div>
      <Scroller type="hover">
        <div className={css["content"]}>
          {filters.map((filter, id) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: index is unique key.
            <Fragment key={id}>
              {filter === "action" && (
                <ActionFilter id={id} resolvedDeck={resolvedDeck} />
              )}
              {filter === "asset" && (
                <AssetFilter id={id} resolvedDeck={resolvedDeck} />
              )}
              {filter === "cost" && (
                <CostFilter id={id} resolvedDeck={resolvedDeck} />
              )}
              {filter === "encounterSet" && <EncounterSetFilter id={id} />}
              {filter === "investigator" && <InvestigatorFilter id={id} />}
              {filter === "level" && <LevelFilter id={id} />}
              {filter === "ownership" && <OwnershipFilter id={id} />}
              {filter === "fanMadeContent" && <FanMadeContentFilter id={id} />}
              {filter === "pack" && <PackFilter id={id} />}
              {filter === "properties" && <PropertiesFilter id={id} />}
              {filter === "skillIcons" && <SkillIconsFilter id={id} />}
              {filter === "subtype" && (
                <SubtypeFilter id={id} resolvedDeck={resolvedDeck} />
              )}
              {filter === "trait" && (
                <TraitFilter id={id} resolvedDeck={resolvedDeck} />
              )}
              {filter === "tabooSet" && <TabooSetFilter id={id} />}
              {filter === "type" && (
                <TypeFilter id={id} resolvedDeck={resolvedDeck} />
              )}

              {filter === "faction" && <FactionFilter id={id} />}

              {filter === "investigatorSkills" && (
                <InvestigatorSkillsFilter id={id} resolvedDeck={resolvedDeck} />
              )}
              {filter === "investigatorCardAccess" && (
                <InvestigatorCardAccessFilter id={id} />
              )}
              {filter === "health" && (
                <HealthFilter id={id} resolvedDeck={resolvedDeck} />
              )}
              {filter === "sanity" && (
                <SanityFilter id={id} resolvedDeck={resolvedDeck} />
              )}
              {filter === "illustrator" && <IllustratorFilter id={id} />}
            </Fragment>
          ))}
        </div>
      </Scroller>
    </search>
  );
}
