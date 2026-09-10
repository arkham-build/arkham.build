import { FloatingPortal } from "@floating-ui/react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "wouter";
import { CardScan } from "@/components/card-scan";
import { Printing } from "@/components/printing";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";
import { useStore } from "@/store";
import {
  type Printing as PrintingT,
  selectLookupTables,
  selectPrintingsForCard,
} from "@/store/selectors/shared";
import { cardUrl, oldFormatCardUrl } from "@/utils/card-utils";
import { groupPrintingsByChapter } from "@/utils/chapters";
import {
  CYCLES_WITH_STANDALONE_PACKS,
  FLOATING_PORTAL_ID,
} from "@/utils/constants";
import { cx } from "@/utils/cx";
import css from "./card-view.module.css";

export function Printings(props: { code: string }) {
  const printings = useStore((state) =>
    selectPrintingsForCard(state, props.code),
  );

  const { t } = useTranslation();
  const [search] = useSearchParams();
  const oldFormat = search.get("old_format") === "true";

  const lookupTables = useStore(selectLookupTables);
  const printingsByChapter = groupPrintingsByChapter(printings);

  return (
    <div className={css["printings-groups"]}>
      {printingsByChapter.map(([chapter, chapterPrintings]) => (
        <section className={css["printings-group"]} key={chapter}>
          <h3 className={css["printings-chapter-title"]}>
            {t("settings.collection.chapter", { number: chapter })}
          </h3>
          <ul className={css["printings"]}>
            {chapterPrintings.map((printing) => {
              const reprintPackCode =
                lookupTables.reprintPacksByPack[printing.pack.code];

              return (
                <li key={`${printing.pack.code}-${printing.card.code}`}>
                  <ListPrinting
                    active={
                      printing.card.code === props.code &&
                      (CYCLES_WITH_STANDALONE_PACKS.includes(
                        printing.cycle.code,
                      ) ||
                        oldFormat === !printing.pack.reprint_type)
                    }
                    printing={printing}
                    oldFormat={!!reprintPackCode}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ListPrinting({
  active,
  oldFormat,
  printing,
}: {
  active?: boolean;
  oldFormat?: boolean;
  printing: PrintingT;
}) {
  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip();

  const url = oldFormat
    ? oldFormatCardUrl(printing.card)
    : cardUrl(printing.card);

  return (
    <>
      <Link
        {...referenceProps}
        className={cx(css["printings-item"], active && css["active"])}
        ref={refs.setReference}
        to={url}
      >
        <Printing printing={printing} linked={false} />
      </Link>
      {isMounted && (
        <FloatingPortal id={FLOATING_PORTAL_ID}>
          <div
            className={css["preview"]}
            ref={refs.setFloating}
            style={{ ...floatingStyles, ...transitionStyles }}
          >
            <CardScan card={printing.card} preventFlip />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
