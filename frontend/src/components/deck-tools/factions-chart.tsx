import type { FactionName } from "@arkham-build/shared";
import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { PieSectorShapeProps } from "recharts";
import { Pie, PieChart, Sector, Tooltip } from "recharts";
import type { ChartableData } from "@/store/lib/deck-charts";
import { ChartTooltip, chartTheme } from "./chart-theme";
import css from "./deck-tools.module.css";

type Props = {
  data: ChartableData<FactionName>;
};

export function FactionsChart({ data }: Props) {
  const { t } = useTranslation();

  const normalizedData = useMemo(() => {
    return data.filter((tick) => tick.y !== 0);
  }, [data]);

  return (
    <div className={css["chart-container"]}>
      <h4 className={css["chart-title"]}>{t("deck.tools.factions")}</h4>
      <PieChart width="100%" height={chartTheme.height} responsive>
        <Pie
          data={normalizedData}
          dataKey="y"
          nameKey="x"
          cx="50%"
          cy="50%"
          outerRadius="90%"
          stroke={chartTheme.colors.pieStroke}
          strokeWidth={chartTheme.strokeWidth.pie}
          label={renderFactionLabel}
          labelLine={false}
          isAnimationActive={false}
          shape={renderFactionSector}
        />
        <Tooltip
          content={<ChartTooltip formatter={(d) => formatTooltip(t, d)} />}
        />
      </PieChart>
    </div>
  );
}

function renderFactionSector(props: PieSectorShapeProps) {
  const faction = props.payload?.x as FactionName | undefined;
  const fill = faction
    ? `var(--${faction === "neutral" ? "text" : "color"}-${faction})`
    : "var(--text)";
  return <Sector {...props} fill={fill} />;
}

function renderFactionLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  payload?: { x: FactionName };
}) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, payload } = props;
  if (!payload) return null;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 16;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const size = 24;

  return (
    <foreignObject x={x - size / 2} y={y - size / 2} width={size} height={size}>
      <i
        className={`icon-${payload.x} fg-${payload.x}`}
        style={{ fontSize: "24px" }}
      />
    </foreignObject>
  );
}

function formatTooltip(t: TFunction, data: Record<string, unknown>) {
  const faction = data.x as string;
  const count = data.y as number;

  return t("deck.tools.factions_tooltip", {
    count,
    faction: t(`common.factions.${faction}`),
    cards: t("common.card", { count }),
  });
}
