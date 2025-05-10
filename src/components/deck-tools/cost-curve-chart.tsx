import type { ChartableData } from "@/store/lib/deck-charts";
import { cx } from "@/utils/cx";
import { range } from "@/utils/range";
import type { TFunction } from "i18next";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  VictoryAxis,
  VictoryChart,
  VictoryContainer,
  VictoryLabel,
  VictoryLine,
  VictoryScatter,
  VictoryTooltip,
} from "victory";
import { useElementSize } from "../../utils/use-element-size";
import { chartsTheme, containerTheme } from "./chart-theme";
import css from "./deck-tools.module.css";

type Props = {
  data: ChartableData;
};

export function CostCurveChart({ data }: Props) {
  const { t } = useTranslation();

  // Ensure that all resource costs (up to the maximum cost)
  // have an actual entry (even if its value is 0)
  const normalizedData = useMemo((): ChartableData => {
    const max = Math.max(...data.filter((x) => x).map((tick) => tick?.x ?? 0));

    return range(0, max + 1).map((cost) => {
      return data.find(({ x }) => x === cost) ?? { x: cost, y: 0 };
    });
  }, [data]);

  // Must have explicit tick values to avoid auto-interpolation,
  // since no card costs 1.5 resources, and you can't have 0.5 cards
  const domainTickValues = useMemo(() => getDiscreteArray(data.length), [data]);
  const codomainTickValues = useMemo(() => {
    const maxAmount = data.reduce(
      (acc, value) => Math.max(value?.y ?? 0, acc),
      0,
    );
    return getDiscreteArray(maxAmount + 1, (x) => x % 2 === 0);
  }, [data]);

  const ref = useRef(null);
  const { width } = useElementSize(ref);

  return (
    <div ref={ref} className={cx(css["chart-container"], css["chart-victory"])}>
      {width > 0 && (
        <>
          <h4 className={css["chart-title"]}>
            {t("deck.tools.resource_costs")}
          </h4>
          <VictoryChart
            theme={chartsTheme}
            padding={{ left: 45, bottom: 40, right: 5 }}
            containerComponent={
              <VictoryContainer responsive={false} style={containerTheme} />
            }
            width={width}
          >
            <VictoryAxis
              tickValues={domainTickValues}
              label={t("deck.tools.resource_cost")}
              tickFormat={formatDomainTickLabels}
              style={{ grid: { stroke: "transparent" } }}
              tickLabelComponent={<VictoryLabel />}
            />
            <VictoryAxis
              dependentAxis
              tickValues={codomainTickValues}
              label={t("deck.tools.cards")}
              tickLabelComponent={<VictoryLabel />}
            />
            <VictoryLine data={normalizedData} width={width} />
            <VictoryScatter
              data={normalizedData}
              size={6}
              labels={formatTooltips(t)}
              labelComponent={
                <VictoryTooltip flyoutWidth={125} constrainToVisibleArea />
              }
            />
          </VictoryChart>
        </>
      )}
    </div>
  );
}

function formatDomainTickLabels(value: number) {
  return value === 7 ? "7+" : value.toString();
}

function formatTooltips(t: TFunction) {
  return (value: { datum: { x: number; y: number } }) => {
    const { y, x } = value.datum;

    return t("deck.tools.resource_cost_tooltip", {
      count: y,
      cost: `${x}${x === 7 ? "+" : ""}`,
      cards: t("common.card", { count: y }),
    });
  };
}

// Creates a [0...n] array of numbers
function getDiscreteArray(length: number, filter?: (x: number) => boolean) {
  const values = Array.from({ length: length }, (_, i) => i);
  return filter ? values.filter(filter) : values;
}
