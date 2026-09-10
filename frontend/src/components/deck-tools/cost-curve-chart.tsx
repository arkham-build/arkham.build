import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartableData } from "@/store/lib/deck-charts";
import { range } from "@/utils/range";
import { axisLabelStyle, axisTickStyle, chartTheme } from "./chart-theme";
import { ChartTooltip } from "./chart-tooltip";
import css from "./deck-tools.module.css";

type Props = {
  costs: number[];
  data: ChartableData;
};

export function CostCurveChart({ costs, data }: Props) {
  const { i18n, t } = useTranslation();

  const normalizedData = useMemo(() => {
    const max = Math.max(...data.filter((x) => x).map((tick) => tick?.x ?? 0));
    return range(0, max + 1).map((cost) => {
      return data.find(({ x }) => x === cost) ?? { x: cost, y: 0 };
    });
  }, [data]);

  const costStats = useMemo(() => calculateCostStats(costs), [costs]);

  return (
    <div className={css["chart-container"]}>
      <h4 className={css["chart-title"]}>{t("deck.tools.resource_costs")}</h4>
      {costStats ? (
        <div className={css["cost-summary"]}>
          <span>
            {t("deck.tools.average_cost", {
              cost: formatCost(i18n.language, costStats.average),
            })}
          </span>
          <span>
            {t("deck.tools.median_cost", {
              cost: formatMedianCost(i18n.language, costStats.median),
            })}
          </span>
        </div>
      ) : null}
      <ResponsiveContainer width="100%" height={chartTheme.height}>
        <BarChart
          data={normalizedData}
          margin={{ left: 5, bottom: 20, right: 5, top: 5 }}
        >
          <CartesianGrid
            stroke={chartTheme.colors.grid}
            strokeDasharray={chartTheme.gridDasharray}
            strokeWidth={chartTheme.strokeWidth.grid}
            vertical={false}
          />
          <XAxis
            dataKey="x"
            tickFormatter={formatDomainTickLabels}
            stroke={chartTheme.colors.axis}
            strokeWidth={chartTheme.strokeWidth.axis}
            tick={axisTickStyle}
            label={{
              value: t("deck.tools.resource_cost"),
              position: "bottom",
              style: axisLabelStyle,
            }}
          />
          <YAxis
            allowDecimals={false}
            stroke={chartTheme.colors.axis}
            strokeWidth={chartTheme.strokeWidth.axis}
            tick={axisTickStyle}
            label={{
              value: t("deck.tools.cards"),
              angle: -90,
              position: "insideLeft",
              style: axisLabelStyle,
            }}
          />
          <Tooltip
            content={<ChartTooltip formatter={(d) => formatTooltip(t, d)} />}
            cursor={{
              fill: chartTheme.colors.cursorFill,
              opacity: chartTheme.cursorOpacity,
            }}
          />
          <Bar
            dataKey="y"
            fill={chartTheme.colors.primary}
            activeBar={{ fill: chartTheme.colors.primaryHover }}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function calculateCostStats(costs: number[]) {
  if (!costs.length) return;

  const sortedCosts = [...costs].sort((a, b) => a - b);
  const total = sortedCosts.reduce((sum, cost) => sum + cost, 0);
  const middle = Math.floor(sortedCosts.length / 2);

  const median =
    sortedCosts.length % 2 === 0
      ? {
          lower: sortedCosts[middle - 1],
          upper: sortedCosts[middle],
        }
      : {
          lower: sortedCosts[middle],
          upper: sortedCosts[middle],
        };

  return {
    average: total / sortedCosts.length,
    median,
  };
}

function formatMedianCost(
  language: string,
  median: { lower: number; upper: number },
) {
  const lower = formatCost(language, median.lower);
  const upper = formatCost(language, median.upper);
  return lower === upper ? lower : `${lower}–${upper}`;
}

function formatCost(language: string, cost: number) {
  return new Intl.NumberFormat(language, {
    maximumFractionDigits: 1,
  }).format(cost);
}

function formatDomainTickLabels(value: number) {
  return value === 7 ? "7+" : value.toString();
}

function formatTooltip(t: TFunction, data: Record<string, unknown>) {
  const x = data.x as number;
  const y = data.y as number;

  return t("deck.tools.resource_cost_tooltip", {
    count: y,
    cost: `${x}${x === 7 ? "+" : ""}`,
    cards: t("common.card", { count: y }),
  });
}
