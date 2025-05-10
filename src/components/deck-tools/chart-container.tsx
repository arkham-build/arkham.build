import { toChartableData } from "@/store/lib/deck-charts";
import type { ResolvedDeck } from "@/store/lib/types";
import { Plane } from "../ui/plane";
import { CostCurveChart } from "./cost-curve-chart";
import css from "./deck-tools.module.css";
import { FactionsChart } from "./factions-chart";
import { SkillIconsChart } from "./skill-icons-chart";
import { TraitsChart } from "./traits-chart";

export default function ChartContainer(props: {
  deck: ResolvedDeck;
}) {
  const { deck } = props;

  return (
    <Plane className={css["charts-wrap"]}>
      <SkillIconsChart data={toChartableData(deck.stats.charts.skillIcons)} />
      <CostCurveChart data={toChartableData(deck.stats.charts.costCurve)} />
      <TraitsChart
        data={toChartableData(deck.stats.charts.traits, "value")}
        deck={deck}
      />
      <FactionsChart data={toChartableData(deck.stats.charts.factions)} />
    </Plane>
  );
}
