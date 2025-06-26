import { CheckIcon, FileDownIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "@/store/services/queries";
import { cx } from "@/utils/cx";
import { useMutate, useQuery } from "@/utils/use-query";
import css from "./card-data-sync.module.css";

type Props = {
  onSyncComplete?: () => void;
  showDetails?: boolean;
};

export function CardDataSync(props: Props) {
  const { onSyncComplete, showDetails } = props;

  const { t } = useTranslation();
  const toast = useToast();

  const init = useStore((state) => state.init);

  const dataVersion = useStore((state) => state.metadata.dataVersion);
  const settings = useStore((state) => state.settings);

  const localizedDataVersionQuery = useCallback(
    () => queryDataVersion(settings.locale),
    [settings.locale],
  );

  const { data, error, state } = useQuery(localizedDataVersionQuery);

  const initStore = useCallback(
    () =>
      init(queryMetadata, queryDataVersion, queryCards, true, settings.locale),
    [init, settings.locale],
  );

  const { error: syncError, state: syncState, mutate } = useMutate(initStore);

  const onSync = useCallback(async () => {
    await mutate().catch(console.error);

    toast.show({
      children: t("settings.card_data.sync_success"),
      duration: 3000,
      variant: "success",
    });

    onSyncComplete?.();
  }, [mutate, onSyncComplete, toast.show, t]);

  const upToDate =
    data &&
    dataVersion &&
    data.locale === dataVersion.locale &&
    data.cards_updated_at === dataVersion.cards_updated_at &&
    data.translation_updated_at === dataVersion.translation_updated_at &&
    data.version === dataVersion.version;

  const loading = state === "loading" || syncState === "loading";

  return (
    <>
      <Field
        bordered={showDetails}
        className={cx(css["sync"], upToDate && css["uptodate"])}
      >
        <div className={css["status"]}>
          {loading && <p>{t("settings.card_data.loading")}</p>}
          {(!!error || !!syncError) && <p>{t("settings.card_data.error")}</p>}
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
        <Button
          disabled={loading || !!error}
          onClick={onSync}
          type="button"
          size="sm"
        >
          {t("settings.card_data.sync")}
        </Button>
        {showDetails && dataVersion && (
          <dl className={css["info"]}>
            <dt>{t("settings.card_data.data_version")}:</dt>
            <dd>{dataVersion.cards_updated_at}</dd>
            <dt>{t("settings.card_data.card_count")}:</dt>
            <dd>{dataVersion.card_count}</dd>
            <dt>{t("settings.card_data.locale")}:</dt>
            <dd>{dataVersion.locale}</dd>
          </dl>
        )}
      </Field>
    </>
  );
}
