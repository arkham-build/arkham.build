import { useQuery } from "@tanstack/react-query";
import { CheckIcon, FileDownIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Field } from "@/components/ui/field";
import { useStore } from "@/store";
import { queryDataVersion } from "@/store/services/queries";
import { cx } from "@/utils/cx";
import css from "./card-data-sync.module.css";

type Props = {
  showDetails?: boolean;
};

export function CardDataSync(props: Props) {
  const { showDetails } = props;

  const { t } = useTranslation();

  const dataVersion = useStore((state) => state.metadata.dataVersion);
  const settings = useStore((state) => state.settings);

  const queryFn = () => queryDataVersion(settings.locale);

  const { data, error, isPending } = useQuery({
    queryKey: ["settings", "dataVersion", settings.locale],
    queryFn,
  });

  const upToDate =
    data &&
    dataVersion &&
    data.locale === dataVersion.locale &&
    data.cards_updated_at === dataVersion.cards_updated_at &&
    data.translation_updated_at === dataVersion.translation_updated_at &&
    data.version === dataVersion.version;

  const loading = isPending;

  return (
    <Field
      bordered={showDetails}
      className={cx(css["sync"], upToDate && css["uptodate"])}
    >
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
      {showDetails && dataVersion && (
        <dl className={css["info"]}>
          <dt>{t("settings.card_data.data_version")}:</dt>
          <dd>{dataVersion.cards_updated_at.split(".")[0]}</dd>
          <dt>{t("settings.card_data.card_count")}:</dt>
          <dd>{dataVersion.card_count}</dd>
          <dt>{t("settings.card_data.locale")}:</dt>
          <dd>{dataVersion.locale}</dd>
        </dl>
      )}
    </Field>
  );
}
