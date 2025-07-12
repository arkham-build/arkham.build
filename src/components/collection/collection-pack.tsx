import PackIcon from "@/components/icons/pack-icon";
import { Checkbox } from "@/components/ui/checkbox";
import type { Cycle } from "@/store/schemas/cycle.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import type { CollectionCounts } from "@/store/selectors/collection";
import { CYCLES_WITH_STANDALONE_PACKS } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { displayPackName } from "@/utils/formatting";
import css from "./collection.module.css";
import { CollectionCount } from "./collection-count";

type Props = {
  canEdit?: boolean;
  canShowCounts?: boolean;
  counts?: CollectionCounts;
  cycle: Cycle;
  hasQuantity: boolean;
  pack: Pack;
  value: number;
  onChange: (code: string, val: number) => void;
};

export function CollectionPack(props: Props) {
  const {
    canEdit,
    canShowCounts,
    counts,
    cycle,
    hasQuantity,
    pack,
    value,
    onChange,
  } = props;

  const onInputChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (evt.target instanceof HTMLInputElement) {
      const val = Number.parseInt(evt.target.value, 10);
      if (!Number.isNaN(val)) onChange(pack.code, val);
    }
  };

  return (
    <li
      className={cx(css["pack"], pack.reprint && css["reprint"])}
      key={pack.code}
    >
      {hasQuantity ? (
        <div className={css["pack-name"]}>
          <input
            className={css["pack-quantity-input"]}
            disabled={!canEdit}
            id={`collection-${cycle.code}-${pack.code}`}
            max={2}
            min={0}
            name={pack.code}
            onChange={onInputChange}
            type="number"
            value={value}
          />
          <PackIcon code={pack.code} />
          <label
            className={css["pack-label"]}
            htmlFor={`collection-${cycle.code}-${pack.code}`}
          >
            {displayPackName(pack)}
          </label>
        </div>
      ) : (
        <Checkbox
          className={css["pack-checkbox"]}
          disabled={!canEdit}
          checked={!!value}
          data-pack={pack.code}
          id={`collection-${cycle.code}-${pack.code}`}
          label={
            <div className={css["pack-name"]}>
              <PackIcon code={pack.code} />
              {displayPackName(pack)}
            </div>
          }
          name={pack.code}
          onCheckedChange={(checked) => onChange(pack.code, checked ? 1 : 0)}
        />
      )}
      {canShowCounts &&
        counts &&
        CYCLES_WITH_STANDALONE_PACKS.includes(cycle.code) && (
          <CollectionCount counts={counts.packs[pack.code]} type="pack" />
        )}
    </li>
  );
}
