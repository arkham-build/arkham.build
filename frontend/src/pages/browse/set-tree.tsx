import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { Link } from "wouter";
import EncounterIcon from "@/components/icons/encounter-icon";
import PackIcon from "@/components/icons/pack-icon";
import { Scroller } from "@/components/ui/scroller";
import { useTabUrlState } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useStore } from "@/store";
import { sortByEncounterSet } from "@/store/lib/sorting";
import type { Cycle } from "@/store/schemas/cycle.schema";
import type { EncounterSet } from "@/store/schemas/encounter-set.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import { selectCyclesAndPacks } from "@/store/selectors/lists";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import { cx } from "@/utils/cx";
import { displayPackName } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import css from "./set-tree.module.css";

type TreeItemBase = {
  children?: TreeItem[];
  type: TreeItemType;
};

type TreeItemType = "cycle" | "pack" | "encounter_set" | "none";

type TreeItem = TreeItemBase &
  (
    | {
        data: Cycle;
        type: "cycle";
      }
    | {
        data: Pack;
        type: "pack";
      }
    | {
        data: EncounterSet;
        type: "encounter_set";
      }
    | {
        data: { name: string; code: string };
        type: "none";
      }
  );

type Tree = TreeItem[];

type FormatChoice = "old" | "new";

const selectCardSetTree = createSelector(
  selectCyclesAndPacks,
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (_: StoreState, formatChoice: FormatChoice) => formatChoice,
  (cycles, metadata, lookupTables, collator, formatChoice) => {
    const tree: Tree = cycles.map((c) => {
      const targetPacks = [];

      const useReprints = formatChoice === "new" && !isEmpty(c.reprintPacks);

      if (!useReprints || c.code === "core") {
        targetPacks.push(...c.packs);
      }

      if (useReprints || c.code === "core") {
        targetPacks.push(...c.reprintPacks);
      }

      return {
        data: c,
        type: "cycle",
        children: targetPacks.map((pack) => {
          const encounterSets = Object.keys(
            lookupTables.encounterCodesByPack[pack.code] ?? {},
          ).map((code) => metadata.encounterSets[code]);

          encounterSets.sort((a, b) =>
            sortByEncounterSet(metadata, collator)(a.code, b.code),
          );

          return {
            data: pack,
            type: "pack",
            children: encounterSets.map((data) => ({
              data,
              type: "encounter_set" as const,
            })),
          };
        }),
      };
    });

    return {
      data: {
        code: "all",
        name: "All cards",
      },
      type: "none" as const,
      children: tree,
    };
  },
);

type SetTreeProps = {
  activeCode?: string;
  activeType?: TreeItemType;
};

export function SetTree({ activeCode, activeType }: SetTreeProps) {
  const [formatSelection, setFormatSelection] = useTabUrlState<FormatChoice>(
    "new",
    "format",
  );

  const { t } = useTranslation();

  const cardSetTree = useStore((state) =>
    selectCardSetTree(state, formatSelection),
  );

  const activeKey = activeType ? `${activeType}-${activeCode}` : "none-all";

  useEffect(() => {
    const activeElement = document.getElementById(activeKey);
    if (activeElement) {
      activeElement.scrollIntoView({ block: "center" });
    }
  });

  return (
    <Scroller className={css["tree"]}>
      <div className={css["format-toggle"]}>
        <ToggleGroup
          value={formatSelection}
          onValueChange={setFormatSelection}
          type="single"
        >
          <ToggleGroupItem value="new">
            {t("settings.collection.new_format")}
          </ToggleGroupItem>
          <ToggleGroupItem value="old">
            {t("settings.collection.old_format")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <SetTreeNode activeKey={activeKey} item={cardSetTree} depth={0} />
    </Scroller>
  );
}

function SetTreeNode({
  activeKey,
  item,
  depth,
}: {
  activeKey: string;
  item: TreeItem;
  depth: number;
}) {
  const id = `${item.type}-${item.data.code}`;

  const isActive = activeKey === `${item.type}-${item.data.code}`;

  const expanded =
    isActive ||
    depth < 2 ||
    item.children?.some(
      (child) => `${child.type}-${child.data.code}` === activeKey,
    );

  const hasChildren = !isEmpty(item.children);

  return (
    <div
      className={cx(
        css["node"],
        isActive && css["active"],
        css[`depth-${depth}`],
      )}
      style={{ "--depth": depth } as React.CSSProperties}
    >
      <Link
        className={css["node-link"]}
        id={id}
        to={
          item.type === "none"
            ? `/browse${window.location.search}`
            : `/browse/${item.type}/${item.data.code}${window.location.search}`
        }
      >
        {item.type === "none" && (
          <>
            <i className="icon-cards" />
            {item.data.name}
          </>
        )}
        {(item.type === "cycle" || item.type === "pack") && (
          <>
            <PackIcon className={css["node-icon"]} code={item.data.code} />
            {displayPackName(item.data)}
          </>
        )}
        {item.type === "encounter_set" && (
          <>
            <EncounterIcon code={item.data.code} />
            {item.data.name}
          </>
        )}
      </Link>
      {expanded && hasChildren && (
        <SetTreeChildren
          activeKey={activeKey}
          // biome-ignore lint/style/noNonNullAssertion: checked implicitly
          items={item.children!}
          depth={depth + 1}
        />
      )}
    </div>
  );
}

function SetTreeChildren({
  activeKey,
  items,
  depth,
}: {
  activeKey: string;
  items: TreeItem[];
  depth: number;
}) {
  return (
    <ol className={css["children"]}>
      {items.map((item) => (
        <li key={item.data.code}>
          <SetTreeNode activeKey={activeKey} item={item} depth={depth} />
        </li>
      ))}
    </ol>
  );
}
