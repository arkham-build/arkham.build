import type React from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sortable } from "@/components/ui/sortable";
import {
  ENCOUNTER_GROUPING_TYPES,
  PLAYER_GROUPING_TYPES,
} from "@/store/lib/grouping";
import { SORTING_TYPES } from "@/store/lib/sorting";
import {
  DECK_DEFAULTS,
  DECK_SCANS_DEFAULTS,
  ENCOUNTER_DEFAULTS,
  INVESTIGATOR_DEFAULTS,
  MIXED_DEFAULTS,
  PLAYER_DEFAULTS,
} from "@/store/slices/settings";
import type { SettingsState } from "@/store/slices/settings.types";
import { formatGroupingType } from "@/utils/formatting";
import css from "./settings.module.css";
import type { SettingProps } from "./types";

interface Props extends SettingProps {
  listKey: keyof SettingsState["lists"];
  title: React.ReactNode;
  disabledSortings?: string[];
  disabledGroupings?: string[];
}

function getGroupItemsForList(listKey: keyof SettingsState["lists"]) {
  if (listKey === "encounter") {
    return [...ENCOUNTER_GROUPING_TYPES];
  }

  if (listKey === "investigator") {
    return ["cycle", "faction"];
  }

  if (listKey === "mixed") {
    return Array.from(
      new Set([...ENCOUNTER_GROUPING_TYPES, ...PLAYER_GROUPING_TYPES]),
    );
  }

  return [...PLAYER_GROUPING_TYPES];
}

function getSortItemsForList(listKey: keyof SettingsState["lists"]) {
  if (listKey === "investigator") {
    return ["cycle", "faction", "name", "position"];
  }

  if (listKey === "encounter") {
    return [...SORTING_TYPES].filter((x) => x !== "level");
  }

  return [...SORTING_TYPES];
}

function getDefaultsForList(listKey: keyof SettingsState["lists"]) {
  if (listKey === "encounter") {
    return structuredClone(ENCOUNTER_DEFAULTS);
  }

  if (listKey === "deck") {
    return structuredClone(DECK_DEFAULTS);
  }

  if (listKey === "deckScans") {
    return structuredClone(DECK_SCANS_DEFAULTS);
  }

  if (listKey === "investigator") {
    return structuredClone(INVESTIGATOR_DEFAULTS);
  }

  if (listKey === "mixed") {
    return structuredClone(MIXED_DEFAULTS);
  }

  return structuredClone(PLAYER_DEFAULTS);
}

export function ListSettings(props: Props) {
  const { listKey, settings, title, setSettings } = props;

  const { t } = useTranslation();
  const [version, setVersion] = useState(0);

  const resetToDefaults = useCallback(() => {
    setSettings((settings) => ({
      ...settings,
      lists: {
        ...settings.lists,
        [listKey]: getDefaultsForList(listKey),
      },
    }));

    setVersion((v) => v + 1);
  }, [listKey, setSettings]);

  return (
    <section className={css["list"]}>
      <header className={css["list-header"]}>
        <h3 className={css["list-title"]}>{title}</h3>
        <Button
          data-testid={`list-settings-reset-${listKey}`}
          onClick={resetToDefaults}
          size="sm"
          type="button"
        >
          {t("lists.reset")}
        </Button>
      </header>
      <ListSettingsList
        activeItems={settings.lists[listKey].group}
        items={getGroupItemsForList(listKey)}
        key={`${version}-${listKey}-group`}
        listKey={listKey}
        setSettings={setSettings}
        subKey="group"
        title={t("lists.group_by")}
      />
      <ListSettingsList
        activeItems={settings.lists[listKey].sort}
        items={getSortItemsForList(listKey)}
        key={`${version}-${listKey}-sort`}
        listKey={listKey}
        setSettings={setSettings}
        subKey="sort"
        title={t("lists.sort_by")}
      />
    </section>
  );
}

function sortListItems<T>(items: T[], activeItems: T[]) {
  return [...items].sort((a, b) => {
    let aIndex = activeItems.indexOf(a);
    let bIndex = activeItems.indexOf(b);

    if (aIndex === -1) aIndex = Number.MAX_SAFE_INTEGER;
    if (bIndex === -1) bIndex = Number.MAX_SAFE_INTEGER;

    return aIndex - bIndex;
  });
}

function ListSettingsList<T extends string>(props: {
  activeItems: T[];
  items: T[];
  listKey: keyof SettingsState["lists"];
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  subKey: "sort" | "group";
  title: React.ReactNode;
}) {
  const { activeItems, items, listKey, subKey, title, setSettings } = props;

  const [listItems, setListItems] = useState(sortListItems(items, activeItems));

  const updateOrder = useCallback(
    (active: T[]) => {
      setSettings((settings) => ({
        ...settings,
        lists: {
          ...settings.lists,
          [listKey]: {
            ...settings.lists[listKey],
            [subKey]: active,
          },
        },
      }));
    },
    [setSettings, listKey, subKey],
  );

  const onSort = useCallback(
    (sorted: T[]) => {
      setListItems(sorted);
      updateOrder(sorted.filter((g) => activeItems.includes(g)));
    },
    [updateOrder, activeItems],
  );

  const onCheckChange = useCallback(
    (type: T, checked: boolean) => {
      const active = items
        .filter((item) => {
          if (item !== type) return activeItems.includes(item);
          return checked;
        })
        .sort((a, b) => {
          return listItems.indexOf(a) - listItems.indexOf(b);
        });

      updateOrder(active);
    },
    [items, activeItems, updateOrder, listItems],
  );

  return (
    <article
      className={css["list-group"]}
      data-testid={`list-settings-${listKey}-${subKey}`}
    >
      <header className={css["list-group-header"]}>
        <h4 className={css["list-group-title"]}>{title}</h4>
      </header>
      <Sortable
        activeItems={activeItems}
        items={listItems}
        onSort={onSort}
        overlayClassName={css["list-overlay"]}
        renderItemContent={(type) => (
          <>
            <Checkbox
              data-testid={`${listKey}-${subKey}-${type}`}
              id={`${listKey}-${subKey}-${type}`}
              checked={activeItems.includes(type)}
              onCheckedChange={(checked) => onCheckChange(type, !!checked)}
              label={formatGroupingType(type)}
            />
          </>
        )}
      />
    </article>
  );
}
