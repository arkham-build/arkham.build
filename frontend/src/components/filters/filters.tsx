import { FilterXIcon } from "lucide-react";
import { useCallback } from "react";
import { Fragment } from "react/jsx-runtime";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  selectActiveListFilters,
  type TargetDeck,
} from "@/store/selectors/lists";
import { selectActiveList } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { useHotkey } from "@/utils/use-hotkey";
import { useResolvedDeck } from "@/utils/use-resolved-deck";
import { PreviewBanner } from "../preview-banner";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { HotkeyTooltip } from "../ui/hotkey";
import { Scroller } from "../ui/scroller";
import { ActionFilter } from "./action-filter";
import { AssetFilter } from "./asset-filter";
import { CardTypeFilter } from "./card-type-filter";
import { CostFilter } from "./cost-filter";
import { CycleFilter } from "./cycle-filter";
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
  targetDeck: TargetDeck | undefined;
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
          {filters.map((filter, id) => {
            const params = {
              id: id,
              resolvedDeck,
              targetDeck: props.targetDeck,
            };

            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: index is unique key.
              <Fragment key={id}>
                {filter === "action" && <ActionFilter {...params} />}
                {filter === "asset" && <AssetFilter {...params} />}
                {filter === "card_type" && (
                  <CardTypeFilter
                    className={css["card-type-filter"]}
                    {...params}
                  />
                )}
                {filter === "cost" && <CostFilter {...params} />}
                {filter === "cycle" && <CycleFilter {...params} />}
                {filter === "encounter_set" && (
                  <EncounterSetFilter {...params} />
                )}
                {filter === "investigator" && (
                  <InvestigatorFilter {...params} />
                )}
                {filter === "level" && <LevelFilter {...params} />}
                {filter === "ownership" && <OwnershipFilter {...params} />}
                {filter === "fan_made_content" && (
                  <FanMadeContentFilter {...params} />
                )}
                {filter === "pack" && <PackFilter {...params} />}
                {filter === "properties" && <PropertiesFilter {...params} />}
                {filter === "skill_icons" && <SkillIconsFilter {...params} />}
                {filter === "subtype" && <SubtypeFilter {...params} />}
                {filter === "trait" && <TraitFilter {...params} />}
                {filter === "taboo_set" && <TabooSetFilter {...params} />}
                {filter === "type" && <TypeFilter {...params} />}
                {filter === "faction" && <FactionFilter {...params} />}
                {filter === "investigator_skills" && (
                  <InvestigatorSkillsFilter {...params} />
                )}
                {filter === "investigator_card_access" && (
                  <InvestigatorCardAccessFilter {...params} />
                )}
                {filter === "health" && <HealthFilter {...params} />}
                {filter === "sanity" && <SanityFilter {...params} />}
                {filter === "illustrator" && <IllustratorFilter {...params} />}
              </Fragment>
            );
          })}
        </div>
      </Scroller>
    </search>
  );
}
