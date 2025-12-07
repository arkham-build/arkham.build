import { cx } from "@/utils/cx";
import css from "./card-health.module.css";
import { HealthIcon, SanityIcon } from "./icons/health-icons";

type Props = {
  className?: string;
  health?: number | null;
  sanity?: number | null;
};

export function CardHealth(props: Props) {
  return (
    <div
      className={cx(props.className, css["health"])}
      data-testid="card-health"
    >
      <HealthIcon health={props.health} />
      <SanityIcon sanity={props.sanity} />
    </div>
  );
}
