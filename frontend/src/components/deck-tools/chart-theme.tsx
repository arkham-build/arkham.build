import type { ReactNode, SVGProps } from "react";
import css from "./deck-tools.module.css";

export const chartTheme = {
  height: 360,

  colors: {
    primary: "var(--nord-10)",
    primaryHover: "var(--nord-9)",
    axis: "var(--palette-2)",
    grid: "var(--palette-3)",
    text: "var(--text)",
    pieStroke: "var(--palette-0)",
    cursorFill: "var(--palette-2)",
  },

  cursorOpacity: 0.3,

  strokeWidth: {
    line: 2,
    axis: 2,
    grid: 1,
    pie: 3,
  },

  gridDasharray: "5 10",

  font: {
    family: "var(--font-family-ui)",
    size: 12,
  },

  scatter: {
    r: 2,
    fill: "var(--nord-10)",
  },
} as const;

export const axisTickStyle: SVGProps<SVGTextElement> = {
  fontFamily: chartTheme.font.family,
  fontSize: chartTheme.font.size,
  fill: chartTheme.colors.text,
};

export const axisLabelStyle = {
  fontFamily: chartTheme.font.family,
  fontSize: chartTheme.font.size,
  fill: chartTheme.colors.text,
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: Record<string, unknown> }>;
  formatter: (data: Record<string, unknown>) => ReactNode;
};

export function ChartTooltip({
  active,
  payload,
  formatter,
}: ChartTooltipProps) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className={css["chart-tooltip"]}>{formatter(payload[0].payload)}</div>
  );
}
