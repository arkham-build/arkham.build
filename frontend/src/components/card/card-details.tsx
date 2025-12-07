import { useTranslation } from "react-i18next";
import type { Card } from "@/store/schemas/card.schema";
import { displayAttribute, numericalStr } from "@/utils/card-utils";
import { formatSlots } from "@/utils/formatting";
import { CardSlots } from "../card-slots";
import css from "./card.module.css";

type Props = {
  card: Card;
  face?: "simple-back";
  omitSlotIcon?: boolean;
};

export function CardDetails(props: Props) {
  const { card, face, omitSlotIcon } = props;
  const { t } = useTranslation();

  const showType = card.type_code !== "investigator";

  // simple double-sided locations don't have clues on back.
  const showClues =
    face !== "simple-back" && (card.clues != null || card.type_code === "act");

  // simple double-sided locations don't have shroud on back.
  const showShroud =
    face !== "simple-back" &&
    (card.type_code === "enemy_location" || card.type_code === "location");

  const showDoom = face !== "simple-back" && !!card.doom;

  return (
    <div className={css["details"]}>
      <div className={css["details-text"]}>
        {(showType || !!card.subtype_code || card.real_slot) && (
          <p className={css["details-type"]}>
            {showType && <span>{t(`common.type.${card.type_code}`)}</span>}

            {card.subtype_code && (
              <span>{t(`common.subtype.${card.subtype_code}`)}</span>
            )}

            {card.real_slot && <span>{formatSlots(card.real_slot)}</span>}
          </p>
        )}

        {card.real_traits && (
          <p className={css["details-traits"]}>
            {displayAttribute(card, "traits")}
          </p>
        )}

        {showDoom && (
          <p>
            {t("common.doom")}: {numericalStr(card.doom)}
            {card.doom_per_investigator && (
              <>
                {" "}
                <i className="icon-text icon-per_investigator" />
              </>
            )}
          </p>
        )}

        {(showClues || showShroud) && (
          <p>
            {showShroud && (
              <span data-testid="shroud">
                {t("common.shroud")}: {numericalStr(card.shroud)}
                {card.shroud_per_investigator && (
                  <>
                    {" "}
                    <i className="icon-text icon-per_investigator" />
                  </>
                )}
              </span>
            )}

            {showClues && (
              <>
                {showShroud && ", "}
                <span data-testid="clues">
                  {t("common.clue", { count: 2 })}: {numericalStr(card.clues)}
                  {!!card.clues && card.clues > 0 && !card.clues_fixed && (
                    <>
                      {" "}
                      <i className="icon-text icon-per_investigator" />
                    </>
                  )}
                </span>
              </>
            )}
          </p>
        )}
      </div>

      {!omitSlotIcon && card.real_slot && (
        <CardSlots className={css["details-slots"]} slot={card.real_slot} />
      )}
    </div>
  );
}
