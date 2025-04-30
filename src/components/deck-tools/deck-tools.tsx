import type { ResolvedDeck } from "@/store/lib/types";
import { cx } from "@/utils/cx";
import { retryFailedDynamicImport } from "@/utils/retry-failed-dynamic-import";
import { Suspense, forwardRef, lazy } from "react";
import { useTranslation } from "react-i18next";
import { Loader } from "../ui/loader";
import { Scroller } from "../ui/scroller";
import { AllAttachables } from "./all-attachables";
import css from "./deck-tools.module.css";
import { DrawSimulator } from "./draw-simulator";
import { LimitedSlots } from "./limited-slots";

type Props = {
  deck: ResolvedDeck;
  readonly?: boolean;
  scrollable?: boolean;
  showTitle?: boolean;
  slotLeft?: React.ReactNode;
  slotRight?: React.ReactNode;
};

const LazyChartContainer = lazy(() =>
  import("./chart-container").catch(retryFailedDynamicImport),
);

export const DeckTools = forwardRef(function DeckTools(
  props: Props,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const { deck, readonly, scrollable } = props;

  const { t } = useTranslation();

  const node = (
    <article className={cx(css["deck-tools"])} ref={ref}>
      <Suspense fallback={<Loader show message={t("deck.tools.loading")} />}>
        <DrawSimulator deck={deck} />
        <LazyChartContainer deck={deck} />
        <LimitedSlots deck={deck} />
        <AllAttachables deck={deck} readonly={readonly} />
      </Suspense>
    </article>
  );

  return scrollable ? (
    <Scroller className={css["scroller"]}>{node}</Scroller>
  ) : (
    node
  );
});
