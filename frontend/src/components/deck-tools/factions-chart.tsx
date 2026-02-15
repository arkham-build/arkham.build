import type { FactionName } from "@arkham-build/shared";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  VictoryContainer,
  type VictoryLabelProps,
  VictoryPie,
  VictoryTooltip,
} from "victory";
import type { ChartableData } from "@/store/lib/deck-charts";
import { cx } from "@/utils/cx";
import { useElementSize } from "../../utils/use-element-size";
import { chartsTheme, containerTheme, tooltipWidth } from "./chart-theme";
import css from "./deck-tools.module.css";

type Props = {
  data: ChartableData<FactionName>;
};

export function FactionsChart({ data }: Props) {
  const ref = useRef(null);
  const { width } = useElementSize(ref);
  const { t } = useTranslation();

  // Remove factions not in the deck so that they don't show as empty labels
  const normalizedData = useMemo((): ChartableData<FactionName> => {
    return data.filter((tick) => tick.y !== 0);
  }, [data]);

  return (
    <div ref={ref} className={cx(css["chart-container"], css["chart-victory"])}>
      {width > 0 && (
        <>
          <h4 className={css["chart-title"]}>{t("deck.tools.factions")}</h4>
          <VictoryPie
            containerComponent={
              <VictoryContainer responsive={false} style={containerTheme} />
            }
            data={normalizedData}
            theme={chartsTheme}
            labelPosition="centroid"
            labelPlacement={"vertical"}
            labelComponent={<CustomLabel />}
            labelRadius={({ radius }) => (radius as number) + 16}
            width={width}
            sortKey={"y"}
            style={{
              data: {
                fill: ({ datum }) =>
                  `var(--${datum.xName === "neutral" ? "text" : "color"}-${
                    datum.xName
                  })`,
              },
            }}
          />
        </>
      )}
    </div>
  );
}

function CustomLabel(props: VictoryLabelProps) {
  const { t } = useTranslation();

  const { datum, x, y } = props;

  const count = datum?.y ?? 0;

  const faction = datum?.xName ?? "unknown";

  const text = t("deck.tools.factions_tooltip", {
    count,
    faction: t(`common.factions.${faction}`),
    cards: t("common.card", { count }),
  });

  const size = 24;

  return (
    <g>
      <foreignObject
        x={(x ?? 0) - size / 2}
        y={(y ?? 0) - size / 2}
        width={size}
        height={size}
      >
        <i
          className={`icon-${faction} fg-${faction}`}
          style={{ fontSize: "24px" }}
        />
      </foreignObject>
      <VictoryTooltip
        // biome-ignore lint/suspicious/noExplicitAny: wrong library typings.
        active={(props as any).active}
        x={props.x}
        y={props.y}
        orientation="bottom"
        angle={0}
        theme={chartsTheme}
        labelPlacement="vertical"
        flyoutWidth={tooltipWidth}
        constrainToVisibleArea
        text={text}
      />
    </g>
  );
}

CustomLabel.defaultEvents = VictoryTooltip.defaultEvents;
