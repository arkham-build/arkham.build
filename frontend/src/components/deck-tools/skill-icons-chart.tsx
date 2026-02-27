import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
} from "recharts";
import type { ChartableData } from "@/store/lib/deck-charts";
import { SkillIconFancy } from "../icons/skill-icon-fancy";
import { ChartTooltip, chartTheme } from "./chart-theme";
import css from "./deck-tools.module.css";

type Props = {
  data: ChartableData<string>;
};

export function SkillIconsChart({ data }: Props) {
  const { t } = useTranslation();

  return (
    <div className={css["chart-container"]}>
      <h4 className={css["chart-title"]}>{t("deck.tools.skill_icons")}</h4>
      <RadarChart
        data={data}
        width="100%"
        height={chartTheme.height}
        cx="50%"
        cy="50%"
        outerRadius="90%"
        responsive
      >
        <PolarGrid
          stroke={chartTheme.colors.grid}
          strokeDasharray={chartTheme.gridDasharray}
        />
        <PolarAngleAxis
          dataKey="x"
          tick={<SkillIconTick />}
          stroke={chartTheme.colors.axis}
          strokeWidth={chartTheme.strokeWidth.axis}
        />
        <PolarRadiusAxis tick={false} axisLine={false} domain={[0, "auto"]} />
        <Radar
          dataKey="y"
          stroke={chartTheme.colors.primary}
          strokeWidth={chartTheme.strokeWidth.line}
          fill={chartTheme.colors.primary}
          fillOpacity={0.15}
          dot={{
            r: chartTheme.scatter.r,
            fill: chartTheme.scatter.fill,
          }}
          isAnimationActive={false}
        />
        <Tooltip
          content={<ChartTooltip formatter={(d) => formatTooltip(t, d)} />}
        />
      </RadarChart>
    </div>
  );
}

function SkillIconTick(props: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const { x, y, payload } = props;
  const skill = payload?.value?.replace("skill_", "") ?? "wild";
  const size = 24;

  return (
    <foreignObject
      x={(x ?? 0) - size / 2}
      y={(y ?? 0) - size / 2}
      width={size}
      height={size}
    >
      <SkillIconFancy skill={skill} className={css["skill-icon-label"]} />
    </foreignObject>
  );
}

function formatTooltip(t: TFunction, data: Record<string, unknown>) {
  const skill = (data.x as string).replace("skill_", "");
  const count = (data.y as number) ?? 0;

  return t("deck.tools.skill_icons_tooltip", {
    count,
    skill: t(`common.skill.${skill}`),
    icons: t("common.icon", { count }),
  });
}
