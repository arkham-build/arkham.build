import { CheckIcon, FileDownIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Field } from "@/components/ui/field";
import { useDataVersionQuery } from "@/queries/cache";
import { useStore } from "@/store";
import { cx } from "@/utils/cx";
import css from "./card-data-sync.module.css";

export function CardDataSync() {
  const { t } = useTranslation();

  const dataVersion = useStore((state) => state.metadata.dataVersion);
  const settings = useStore((state) => state.settings);

  const { data, error, isPending } = useDataVersionQuery(settings.locale);

  const upToDate =
    data &&
    dataVersion &&
    data.locale === dataVersion.locale &&
    data.cards_updated_at === dataVersion.cards_updated_at &&
    data.metadata_version === dataVersion.metadata_version &&
    data.translation_updated_at === dataVersion.translation_updated_at &&
    data.ingested_commit_id === dataVersion.ingested_commit_id;

  const loading = isPending;

  return (
    <Field bordered className={cx(css["sync"], upToDate && css["uptodate"])}>
      <div className={css["status"]}>
        {loading && <p>{t("settings.card_data.loading")}</p>}
        {!!error && <p>{t("settings.card_data.error")}</p>}
        {!loading &&
          data &&
          (upToDate ? (
            <p>
              <CheckIcon className={css["status-icon"]} />{" "}
              {t("settings.card_data.up_to_date")}
            </p>
          ) : (
            <p>
              <FileDownIcon className={css["status-icon"]} />{" "}
              {t("settings.card_data.update_available")}
            </p>
          ))}
      </div>
      {dataVersion && (
        <dl className={css["info"]}>
          <dt>{t("settings.card_data.data_version")}:</dt>
          <dd>{dataVersion.cards_updated_at.split(".")[0]}</dd>
          <dt>{t("settings.card_data.card_count")}:</dt>
          <dd>{dataVersion.card_count}</dd>
          <dt>{t("settings.card_data.data_version")}:</dt>
          <dd>
            {dataVersion.ingested_commit_id?.slice(0, 7) ??
              "arkham-cards-api-legacy"}
          </dd>
          <dt>{t("settings.card_data.locale")}:</dt>
          <dd>{dataVersion.locale}</dd>
        </dl>
      )}
    </Field>
  );
}
