import type { ChartableData } from "@/store/lib/deck-charts";
import { cx } from "@/utils/cx";
import type { TFunction } from "i18next";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  VictoryChart,
  VictoryContainer,
  VictoryLine,
  VictoryPolarAxis,
  VictoryScatter,
  VictoryTooltip,
} from "victory";
import { useElementSize } from "../../utils/use-element-size";
import { SkillIconFancy } from "../icons/skill-icon-fancy";
import { chartsTheme, containerTheme } from "./chart-theme";
import css from "./deck-tools.module.css";

type Props = {
  data: ChartableData<string>;
};

export function SkillIconsChart({ data }: Props) {
  const ref = useRef(null);
  const { width } = useElementSize(ref);
  const { t } = useTranslation();

  return (
    <div ref={ref} className={cx(css["chart-container"], css["chart-victory"])}>
      {width > 0 && (
        <>
          <h4 className={css["chart-title"]}>{t("deck.tools.skill_icons")}</h4>
          <VictoryChart
            containerComponent={
              <VictoryContainer style={containerTheme} responsive={false} />
            }
            theme={chartsTheme}
            polar
            width={width}
          >
            <VictoryPolarAxis
              tickFormat={formatTickLabels}
              tickLabelComponent={<SkillIconLabel />}
            />
            <VictoryPolarAxis
              dependentAxis
              style={{ tickLabels: { fill: "none" }, axis: { stroke: "none" } }}
            />
            <VictoryLine data={data} />
            <VictoryScatter
              data={data}
              size={5}
              labels={formatTooltips(t)}
              labelComponent={
                <VictoryTooltip
                  labelPlacement="vertical"
                  flyoutWidth={200}
                  constrainToVisibleArea
                />
              }
            />
          </VictoryChart>
        </>
      )}
    </div>
  );
}

function formatTickLabels(value: string) {
  return value.replace("skill_", "");
}

function formatTooltips(t: TFunction) {
  return (value: { datum: { xName: string; y: number } }) => {
    const { xName, y } = value.datum;
    const skill = xName.replace("skill_", "");
    return `${y} ${t(`common.skill.${skill}`)} ${t("common.icon", { count: y })}`;
  };
}

function SkillIconLabel(props: {
  text?: string;
  x?: number;
  y?: number;
}) {
  const { text, x, y } = props;
  const SKILL_ICON_SIZE = 24;

  return (
    <foreignObject
      x={(x ?? 0) - SKILL_ICON_SIZE / 2}
      y={(y ?? 0) - SKILL_ICON_SIZE / 2}
      width={SKILL_ICON_SIZE}
      height={SKILL_ICON_SIZE}
    >
      <SkillIconFancy
        skill={text || "wild"}
        className={css["skill-icon-label"]}
      />
    </foreignObject>
  );
}
