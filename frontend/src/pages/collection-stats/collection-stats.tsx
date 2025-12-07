import { Trans, useTranslation } from "react-i18next";
import { Link } from "wouter";
import { CollectionSettings } from "@/components/collection/collection";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import { selectTotalOwned } from "@/store/selectors/collection";
import { cx } from "@/utils/cx";
import css from "./collection-stats.module.css";

function CollectionStats() {
  const { t } = useTranslation();
  const settings = useStore((state) => state.settings);

  const ownedCount = useStore(selectTotalOwned);

  return (
    <AppLayout title={t("collection_stats.title")}>
      <div className={cx(css["layout"])}>
        <h1 className={css["title"]}>{t("collection_stats.title")}</h1>
        <div className={cx(css["content"], "longform")}>
          <p>
            <Trans
              i18nKey="collection_stats.description"
              t={t}
              components={{ a: <Link href="/settings" /> }}
            />
          </p>
          <blockquote>
            <Trans
              i18nKey="collection_stats.counts"
              t={t}
              values={{
                player_count: ownedCount.player,
                encounter_count: ownedCount.encounter,
              }}
              components={{ strong: <strong /> }}
            />
          </blockquote>
        </div>
        <CollectionSettings canShowCounts settings={settings} />
      </div>
    </AppLayout>
  );
}

export default CollectionStats;
