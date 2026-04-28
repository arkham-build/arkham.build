import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectTagCounts } from "@/store/selectors/lists";
import { axisLabelStyle, axisTickStyle, chartTheme } from "./chart-theme";
import { ChartTooltip } from "./chart-tooltip";
import css from "./deck-tools.module.css";

type Props = {
  countInstances?: boolean;
  deck: ResolvedDeck;
  showUntagged?: boolean;
  untaggedCount?: number;
};

export function TagsChart({
  countInstances,
  deck,
  showUntagged,
  untaggedCount,
}: Props) {
  const { t } = useTranslation();

  const customTagsEnabled = useStore(
    (state) => state.settings.customTagsEnabled,
  );
  const globalCardTags = useStore(
    (state) => state.settings.globalCardTags ?? {},
  );

  if (!customTagsEnabled) return null;

  const tagCounts = selectTagCounts(
    deck.cardTags,
    globalCardTags,
    countInstances ? deck.slots : undefined,
  );
  if (tagCounts.size === 0) return null;

  const data: { x: string; y: number; untagged: boolean }[] = Array.from(
    tagCounts.entries(),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ x: tag, y: count, untagged: false }));

  if (showUntagged && untaggedCount) {
    data.push({
      x: t("deck.tools.untagged"),
      y: untaggedCount,
      untagged: true,
    });
  }

  const height = Math.max(120, data.length * 36 + 40);

  return (
    <div className={css["chart-container"]}>
      <h4 className={css["chart-title"]}>{t("deck.tools.tags_chart_title")}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 8, right: 24, top: 5, bottom: 24 }}
        >
          <CartesianGrid
            stroke={chartTheme.colors.grid}
            strokeDasharray={chartTheme.gridDasharray}
            strokeWidth={chartTheme.strokeWidth.grid}
            horizontal={false}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            stroke={chartTheme.colors.axis}
            strokeWidth={chartTheme.strokeWidth.axis}
            tick={axisTickStyle}
            label={{
              value: t("deck.tools.cards"),
              position: "insideBottom",
              offset: -12,
              style: axisLabelStyle,
            }}
          />
          <YAxis
            type="category"
            dataKey="x"
            width={96}
            stroke={chartTheme.colors.axis}
            strokeWidth={chartTheme.strokeWidth.axis}
            tick={axisTickStyle}
          />
          <Tooltip
            content={<ChartTooltip formatter={(d) => formatTooltip(t, d)} />}
            cursor={{
              fill: chartTheme.colors.cursorFill,
              opacity: chartTheme.cursorOpacity,
            }}
          />
          <Bar dataKey="y" isAnimationActive={false}>
            {data.map((entry) => (
              <Cell
                key={entry.x}
                fill={
                  entry.untagged
                    ? chartTheme.colors.axis
                    : chartTheme.colors.primary
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatTooltip(t: TFunction, data: Record<string, unknown>) {
  const count = data.y as number;
  if (data.untagged) {
    return t("deck.tools.untagged_tooltip", {
      count,
      cards: t("common.card", { count }),
    });
  }
  const tag = data.x as string;
  return t("deck.tools.tags_tooltip", {
    tag,
    count,
    cards: t("common.card", { count }),
  });
}
