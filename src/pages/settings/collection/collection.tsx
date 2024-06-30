import { useCallback, useEffect, useState } from "react";

import PackIcon from "@/components/icons/pack-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { useStore } from "@/store";
import { selectCyclesAndPacks } from "@/store/selectors/lists";
import type { SettingsState } from "@/store/slices/settings.types";

import css from "./collection.module.css";

import { CollectionCycleActions } from "./collection-cycle-actions";
import { CollectionPack } from "./collection-pack";

type Props = {
  settings: SettingsState;
};

export function Collection({ settings }: Props) {
  const cyclesWithPacks = useStore(selectCyclesAndPacks);

  const [showAllCards, setShowAllCards] = useState(settings.showAllCards);
  const [collectionState, setCollectionState] = useState(settings.collection);

  useEffect(() => {
    setCollectionState(settings.collection);
  }, [settings]);

  const onCheckShowAll = useCallback((val: boolean | string) => {
    setShowAllCards(!!val);
  }, []);

  const onCheckPack = useCallback((packCode: string, val: number) => {
    setCollectionState((prev) => ({ ...prev, [packCode]: val }));
  }, []);

  const onToggleCycle = useCallback(
    (evt: React.MouseEvent) => {
      if (evt.currentTarget instanceof HTMLButtonElement) {
        const code = evt.currentTarget.dataset.cycle;
        const val = Number.parseInt(
          evt.currentTarget.dataset.val as string,
          10,
        );

        const cycle = cyclesWithPacks.find((c) => c.code === code);
        if (cycle) {
          setCollectionState((prev) => {
            const update = cycle.packs.reduce<SettingsState["collection"]>(
              (acc, curr) => {
                if (!curr.reprint) acc[curr.code] = val;
                return acc;
              },
              {},
            );

            return { ...prev, ...update };
          });
        }
      }
    },
    [cyclesWithPacks],
  );

  return (
    <>
      <Field
        bordered
        helpText="When this is checked, the collection settings below are ignored."
      >
        <Checkbox
          checked={showAllCards}
          data-testid="settings-show-all"
          id="show-all-cards"
          label="Show all cards"
          name="show-all-cards"
          onCheckedChange={onCheckShowAll}
        />
      </Field>
      <Field bordered>
        <details open={!showAllCards}>
          <summary>Card collection</summary>
          <fieldset
            className={css["container"]}
            data-testid="settings-collection"
            id="collection"
          >
            <ol className={css["cycles"]}>
              {cyclesWithPacks.map((cycle) => (
                <li className={css["cycle"]} key={cycle.code}>
                  <div className={css["cycle-header"]}>
                    <div className={css["cycle-label"]}>
                      <PackIcon code={cycle.code} />
                      {cycle.real_name}
                    </div>
                    {!cycle.reprintPacks.length && cycle.code !== "core" && (
                      <CollectionCycleActions
                        cycleCode={cycle.code}
                        onToggleCycle={onToggleCycle}
                      />
                    )}
                  </div>

                  {!!cycle.reprintPacks.length && (
                    <div>
                      <div className={css["cycle-subheader"]}>New format</div>
                      <ol className={css["packs"]}>
                        {cycle.reprintPacks.map((pack) => (
                          <CollectionPack
                            cycle={cycle}
                            hasQuantity={pack.code === "core"}
                            key={pack.code}
                            onChange={onCheckPack}
                            pack={pack}
                            value={collectionState[pack.code] ?? 0}
                          />
                        ))}
                      </ol>
                    </div>
                  )}

                  <div>
                    {!!cycle.reprintPacks.length && (
                      <div className={css["cycle-subheader"]}>
                        Old format
                        {cycle.code !== "core" && (
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
                          cycle={cycle}
                          hasQuantity={pack.code === "core"}
                          key={pack.code}
                          onChange={onCheckPack}
                          pack={pack}
                          value={collectionState[pack.code] ?? 0}
                        />
                      ))}
                    </ol>
                  </div>
                </li>
              ))}
            </ol>
          </fieldset>
        </details>
      </Field>
    </>
  );
}
