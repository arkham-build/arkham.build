import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  type ListState,
  selectActiveListChanges,
} from "@/store/selectors/lists";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./card-list-count.module.css";

export function CardlistCount(props: { data: ListState | undefined }) {
  const { data } = props;
  const { t } = useTranslation();

  const count = data?.cards.length ?? 0;
  const filteredCount = data ? data.totalCardCount - data.cards.length : 0;

  const filterChanges = useStore(selectActiveListChanges);

  const tooltipOptions = useMemo(
    () => ({ placement: "bottom-start" as const }),
    [],
  );

  return (
    <>
      <span className={css["cardlist-count-short"]}>
        {t("lists.nav.card_count", { count })}
      </span>
      <span className={css["cardlist-count"]}>
        <span data-testid="cardlist-count">
          {t("lists.nav.card_count", { count })}
        </span>
        {filteredCount > 0 && (
          <DefaultTooltip
            className={css["cardlist-count-tooltip"]}
            options={tooltipOptions}
            tooltip={
              <dl>
                {filterChanges.map(({ type, change }, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: no stable key available.
                  <Fragment key={i}>
                    <dt>
                      <strong>{t(`filters.${type}.title`)}:</strong>
                    </dt>
                    <dd>{change}</dd>
                  </Fragment>
                ))}
              </dl>
            }
          >
            <small>
              <em>
                {" "}
                {t("lists.nav.card_count_hidden", { count: filteredCount })}
              </em>
            </small>
          </DefaultTooltip>
        )}
      </span>
    </>
  );
}
