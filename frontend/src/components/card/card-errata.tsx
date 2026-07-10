import { ChevronDownIcon, LoaderCircleIcon, PenLineIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCardErrataQuery } from "@/queries/grimoire";
import { parseCardTextHtml } from "@/utils/card-utils";
import { formatDate } from "@/utils/formatting";
import css from "./card.module.css";

type Props = {
  cardCode: string;
  errataDate: string;
  size: "full" | "compact" | "tooltip";
};

export function CardErrata(props: Props) {
  const { cardCode, errataDate, size } = props;
  const enabled = size !== "tooltip";

  const errata = useCardErrataQuery(cardCode, enabled);
  const { t } = useTranslation();

  if (!enabled) return null;

  const notice = t("card_view.errata_notice", {
    date: formatDate(errataDate),
  });

  if (errata.error) {
    return (
      <div className={css["errata"]}>
        <div className={css["errata-header"]}>
          <PenLineIcon />
          {notice}
        </div>
      </div>
    );
  }

  if (errata.isPending) {
    return (
      <details className={css["errata"]}>
        <summary className={css["errata-header"]}>
          <PenLineIcon />
          {notice}
        </summary>
        <LoaderCircleIcon className="spin" />
      </details>
    );
  }

  if (!errata.data.length) return null;

  return (
    <details className={css["errata"]}>
      <summary className={css["errata-header"]}>
        <PenLineIcon />
        {notice}
        <ChevronDownIcon />
      </summary>
      {errata.data.map(({ ruling }, index) => (
        <p
          // oxlint-disable-next-line react/no-danger -- HTML is from trusted source.
          dangerouslySetInnerHTML={{
            __html: parseCardTextHtml(ruling, { bullets: true }),
          }}
          // oxlint-disable-next-line react/no-array-index-key -- order is stable from the API.
          key={index}
        />
      ))}
    </details>
  );
}
