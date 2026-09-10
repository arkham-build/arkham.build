import css from "./deck-tools.module.css";

type ChartTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: Record<string, unknown> }>;
  formatter: (data: Record<string, unknown>) => React.ReactNode;
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
