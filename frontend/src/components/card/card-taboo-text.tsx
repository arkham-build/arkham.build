import { useTranslation } from "react-i18next";
import type { Card } from "@/store/schemas/card.schema";
import { displayAttribute, parseCardTextHtml } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./card.module.css";

type Props = {
  card: Card;
  children?: React.ReactNode;
  showOriginalText?: boolean;
};

const TOOLTIP_OPTIONS = {
  placement: "top-start" as const,
};

export function CardTabooText(props: Props) {
  const { card, children, showOriginalText } = props;
  const { original, real_taboo_text_change, taboo_xp } = card;

  const { t } = useTranslation();

  if (!real_taboo_text_change && taboo_xp == null) return null;

  const textTransformed = (card.taboo_set_id as number) > 5;

  return (
    <div className={cx("border-taboo", css["text"])} data-testid="card-taboo">
      {!!real_taboo_text_change && (
        <div>
          <DefaultTooltip
            options={TOOLTIP_OPTIONS}
            paused={!textTransformed}
            tooltip={
              <span
                // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted origin.
                dangerouslySetInnerHTML={{
                  __html: parseCardTextHtml(
                    displayAttribute(props.card, "taboo_text_change"),
                  ),
                }}
              />
            }
          >
            <p>
              <i className="icon-tablet color-taboo icon-text" />{" "}
              {t("common.taboo")} <br />
              {textTransformed ? (
                <p className={css["taboo-change"]}>
                  {t("common.taboo_mutated")}.
                </p>
              ) : (
                <p className={css["taboo-change"]}>
                  <em
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted origin.
                    dangerouslySetInnerHTML={{
                      __html: parseCardTextHtml(
                        displayAttribute(card, "taboo_text_change"),
                      ),
                    }}
                  />
                </p>
              )}
            </p>
          </DefaultTooltip>
          {textTransformed &&
            showOriginalText &&
            original != null &&
            !!real_taboo_text_change && (
              <details className={css["taboo-original-text"]}>
                <summary>{t("common.taboo_original_text")}</summary>
                <div className={cx(css["text"])}>
                  <div
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted origin.
                    dangerouslySetInnerHTML={{
                      __html: parseCardTextHtml(
                        displayAttribute(original as Card, "text"),
                      ),
                    }}
                  />
                  {card.real_back_text && (
                    <div
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted origin.
                      dangerouslySetInnerHTML={{
                        __html: parseCardTextHtml(
                          displayAttribute(original as Card, "back_text"),
                        ),
                      }}
                    />
                  )}
                </div>
              </details>
            )}
        </div>
      )}
      {children && <div className={css["taboo-extra"]}>{children}</div>}
      {taboo_xp != null && (
        <p className={css["taboo-chain"]}>
          <i className="icon-tablet color-taboo icon-text" />
          {taboo_xp > 0
            ? t("common.taboo_chained", { xp: taboo_xp })
            : t("common.taboo_unchained", { xp: Math.abs(taboo_xp) })}
        </p>
      )}
    </div>
  );
}
