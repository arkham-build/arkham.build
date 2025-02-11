import type { Card } from "@/store/services/queries.types";
import { parseCardTextHtml } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { useTranslation } from "react-i18next";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./card.module.css";

type Props = {
  card: Card;
};

const TOOLTIP_OPTIONS = {
  placement: "top-start" as const,
};

export function CardTabooText(props: Props) {
  const { real_taboo_text_change, taboo_xp } = props.card;

  const { t } = useTranslation();

  if (!real_taboo_text_change && taboo_xp == null) return null;

  return (
    <div className={cx("border-taboo", css["text"])} data-testid="card-taboo">
      {!!real_taboo_text_change && (
        <DefaultTooltip
          options={TOOLTIP_OPTIONS}
          tooltip={
            <span
              // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted origin.
              dangerouslySetInnerHTML={{
                __html: parseCardTextHtml(real_taboo_text_change),
              }}
            />
          }
        >
          <p>
            <i className="icon-tablet color-taboo icon-text" /> Taboo List{" "}
            <br />
            {t("common.taboo_mutated")}.
          </p>
        </DefaultTooltip>
      )}
      {taboo_xp != null && (
        <p>
          <i className="icon-tablet color-taboo icon-text" />
          {taboo_xp > 0
            ? t("common.taboo_chained", { xp: taboo_xp })
            : t("common.taboo_unchained", { xp: Math.abs(taboo_xp) })}
        </p>
      )}
    </div>
  );
}
