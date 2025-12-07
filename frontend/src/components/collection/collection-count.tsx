import { useTranslation } from "react-i18next";
import type { Counts } from "@/store/selectors/collection";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./collection.module.css";

type Props = {
  counts?: Counts;
  type: "cycle" | "pack";
};

export function CollectionCount(props: Props) {
  const { counts, type } = props;
  const { t } = useTranslation();

  if (!counts) return null;

  return (
    <div className={css["collection-counts"]}>
      <DefaultTooltip
        tooltip={t("collection_stats.tooltip_count_player", {
          type: t(`common.${type}`, { count: 1 }),
        })}
      >
        <div className={css["collection-count"]}>
          <i className="icon-per_investigator" /> {counts.player}
        </div>
      </DefaultTooltip>
      <DefaultTooltip
        tooltip={t("collection_stats.tooltip_count_encounter", {
          type: t(`common.${type}`, { count: 1 }),
        })}
      >
        <div className={css["collection-count"]}>
          <i className="icon-auto_fail" /> {counts.encounter}
        </div>
      </DefaultTooltip>
    </div>
  );
}
