import { cx } from "@/utils/cx";
import { CostIcon } from "./cost-icon";
import css from "./health-icons.module.css";

export function HealthIcon({
  health,
  hideCost,
}: {
  health?: number | null;
  hideCost?: boolean;
}) {
  return (
    <div className={css["health"]} data-testid="health" data-value={health}>
      {hideCost && (
        <i className={cx(css["icon-background"], "icon-health_inverted")} />
      )}
      <i className={cx(css["icon-base"], "icon-health")} />
      {!hideCost && <CostIcon className={css["icon-cost"]} cost={health} />}
    </div>
  );
}

export function SanityIcon({
  sanity,
  hideCost,
}: {
  sanity?: number | null;
  hideCost?: boolean;
}) {
  return (
    <div className={css["sanity"]} data-testid="sanity" data-value={sanity}>
      {hideCost && (
        <i className={cx(css["icon-background"], "icon-sanity_inverted")} />
      )}
      <i className={cx(css["icon-base"], "icon-sanity")} />
      {!hideCost && <CostIcon className={css["icon-cost"]} cost={sanity} />}
    </div>
  );
}
