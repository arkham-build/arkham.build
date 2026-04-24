import { BarChart3Icon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import PackIcon from "@/components/icons/pack-icon";
import { Field, FieldLabel } from "@/components/ui/field";
import { useStore } from "@/store";
import { selectCycleCardCounts } from "@/store/selectors/collection";
import {
  groupCyclesByChapter,
  selectCyclesAndPacks,
} from "@/store/selectors/lists";
import type { SettingsState } from "@/store/slices/settings.types";
import { official } from "@/utils/card-utils";
import { CYCLES_WITH_STANDALONE_PACKS } from "@/utils/constants";
import { displayPackName } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import { Button } from "../ui/button";
import { MediaCard } from "../ui/media-card";
import css from "./collection.module.css";
import { CollectionChapterActions } from "./collection-chapter-actions";
import { CollectionCount } from "./collection-count";
import { CollectionCycleActions } from "./collection-cycle-actions";
import { CollectionPack } from "./collection-pack";

type Props = {
  canShowCounts?: boolean;
  settings: SettingsState;
  setSettings?: (settings: React.SetStateAction<SettingsState>) => void;
};

export function CollectionSettings(props: Props) {
  const { canShowCounts, settings, setSettings } = props;

  const { t } = useTranslation();
  const cyclesWithPacks = useStore(selectCyclesAndPacks);

  const collectionCycles = useMemo(() => {
    const officialCycles = cyclesWithPacks.filter((cycle) => official(cycle));
    return officialCycles;
  }, [cyclesWithPacks]);

  const cyclesByChapter = useMemo(
    () => groupCyclesByChapter(collectionCycles),
    [collectionCycles],
  );

  const canEdit = !!setSettings;

  const onCheckPack = useCallback(
    (packCode: string, val: number) => {
      setSettings?.((prev) => ({
        ...prev,
        collection: {
          ...prev.collection,
          [packCode]: val,
        },
      }));
    },
    [setSettings],
  );

  const onToggleChapter = useCallback(
    (evt: React.MouseEvent) => {
      if (evt.currentTarget instanceof HTMLButtonElement) {
        const chapter = evt.currentTarget.dataset.chapter;

        const val = Number.parseInt(
          evt.currentTarget.dataset.val as string,
          10,
        );

        const cycles = cyclesByChapter.find(([c]) => c === chapter)?.[1] ?? [];

        setSettings?.((prev) => ({
          ...prev,
          collection: {
            ...prev.collection,
            ...cycles.reduce<SettingsState["collection"]>((acc, cycle) => {
              for (const pack of [...cycle.packs, ...cycle.reprintPacks]) {
                acc[pack.code] = val;
              }
              return acc;
            }, {}),
          },
        }));
      }
    },
    [cyclesByChapter, setSettings],
  );

  const onToggleCycle = useCallback(
    (evt: React.MouseEvent) => {
      if (evt.currentTarget instanceof HTMLButtonElement) {
        const code = evt.currentTarget.dataset.cycle;
        const reprint = evt.currentTarget.dataset.reprint === "true";

        const val = Number.parseInt(
          evt.currentTarget.dataset.val as string,
          10,
        );

        const cycle = collectionCycles.find((c) => c.code === code);

        if (cycle) {
          const packs = reprint ? cycle.reprintPacks : cycle.packs;

          const update = packs.reduce<SettingsState["collection"]>(
            (acc, curr) => {
              acc[curr.code] = val;
              return acc;
            },
            {},
          );

          setSettings?.((prev) => ({
            ...prev,
            collection: {
              ...prev.collection,
              ...update,
            },
          }));
        }
      }
    },
    [collectionCycles, setSettings],
  );

  const counts = useStore((state) =>
    canShowCounts ? selectCycleCardCounts(state) : undefined,
  );

  return (
    <Field bordered>
      <FieldLabel className={css["collection-label"]} htmlFor="collection">
        <strong>{t("settings.collection.card_collection")}</strong>
        {!canShowCounts && (
          <Link asChild href="~/collection-stats">
            <Button as="a" variant="bare">
              <BarChart3Icon /> {t("collection_stats.title")}
            </Button>
          </Link>
        )}
      </FieldLabel>
      <fieldset
        className={css["container"]}
        data-testid="settings-collection"
        name="collection"
        id="collection"
      >
        {cyclesByChapter.map(([chapter, cycles]) => (
          <div className={css["chapter"]} key={chapter}>
            <div className={css["chapter-header"]}>
              <h3 className={css["chapter-title"]}>
                {t("settings.collection.chapter", {
                  number: chapter,
                })}
              </h3>
              {canEdit && (
                <CollectionChapterActions
                  chapter={chapter}
                  onToggleChapter={onToggleChapter}
                />
              )}
            </div>
            <div className={css["cycles"]}>
              {cycles.map((cycle) => (
                <MediaCard
                  key={cycle.code}
                  bannerAlt={`Cycle ${displayPackName(cycle)} backdrop`}
                  bannerUrl={`/assets/cycles/${cycle.code}.avif`}
                  title={
                    <div className={css["cycle-header-container"]}>
                      <div className={css["cycle-label"]}>
                        <PackIcon code={cycle.code} />
                        {displayPackName(cycle)}
                      </div>
                      {canEdit &&
                        !cycle.reprintPacks.length &&
                        cycle.code !== "core" && (
                          <CollectionCycleActions
                            cycleCode={cycle.code}
                            onToggleCycle={onToggleCycle}
                          />
                        )}
                    </div>
                  }
                >
                  {!isEmpty(cycle.reprintPacks) && (
                    <div>
                      <div className={css["cycle-subheader"]}>
                        {t("settings.collection.new_format")}
                        {canEdit && cycle.code !== "core" && (
                          <CollectionCycleActions
                            cycleCode={cycle.code}
                            onToggleCycle={onToggleCycle}
                            reprint
                          />
                        )}
                      </div>
                      <ol className={css["packs"]}>
                        {cycle.reprintPacks.map((pack) => (
                          <CollectionPack
                            canEdit={canEdit}
                            canShowCounts={canShowCounts}
                            counts={counts}
                            cycle={cycle}
                            hasQuantity={pack.code === "core"}
                            key={pack.code}
                            onChange={onCheckPack}
                            pack={pack}
                            value={settings.collection[pack.code] ?? 0}
                          />
                        ))}
                      </ol>
                    </div>
                  )}

                  <div>
                    {!isEmpty(cycle.reprintPacks) && (
                      <div className={css["cycle-subheader"]}>
                        {t("settings.collection.old_format")}
                        {canEdit && cycle.code !== "core" && (
                          <CollectionCycleActions
                            cycleCode={cycle.code}
                            onToggleCycle={onToggleCycle}
                          />
                        )}
                      </div>
                    )}
                    <ol className={css["packs"]}>
                      {cycle.packs.map((pack) => (
                        <CollectionPack
                          canEdit={canEdit}
                          canShowCounts={canShowCounts}
                          counts={counts}
                          cycle={cycle}
                          hasQuantity={pack.code === "core"}
                          key={pack.code}
                          onChange={onCheckPack}
                          pack={pack}
                          value={settings.collection[pack.code] ?? 0}
                        />
                      ))}
                    </ol>
                  </div>

                  {canShowCounts &&
                    counts &&
                    !CYCLES_WITH_STANDALONE_PACKS.includes(cycle.code) && (
                      <article className={css["cycle-counts"]}>
                        <header>
                          <h4 className={css["cycle-counts-title"]}>
                            {t("settings.collection.card_count")}
                          </h4>
                        </header>
                        <CollectionCount
                          counts={counts.cycles[cycle.code]}
                          type="cycle"
                        />
                      </article>
                    )}
                </MediaCard>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
    </Field>
  );
}
