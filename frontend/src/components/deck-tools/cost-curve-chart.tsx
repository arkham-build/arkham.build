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
import {
  axisLabelStyle,
  axisTickStyle,
  ChartTooltip,
  chartTheme,
} from "./chart-theme";
import css from "./deck-tools.module.css";

type Props = {
  data: ChartableData;
};

export function CostCurveChart({ data }: Props) {
  const { t } = useTranslation();

  const normalizedData = useMemo(() => {
    const max = Math.max(...data.filter((x) => x).map((tick) => tick?.x ?? 0));
    return range(0, max + 1).map((cost) => {
      return data.find(({ x }) => x === cost) ?? { x: cost, y: 0 };
    });
  }, [data]);

  return (
    <div className={css["chart-container"]}>
      <h4 className={css["chart-title"]}>{t("deck.tools.resource_costs")}</h4>
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
