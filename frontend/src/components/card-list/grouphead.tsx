import { Link } from "wouter";
import { getGroupingKeyLabel, NONE } from "@/store/lib/grouping";
import type { CardGroup } from "@/store/selectors/lists";
import type { Metadata } from "@/store/slices/metadata.types";
import { splitMultiValue } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import EncounterIcon from "../icons/encounter-icon";
import { FactionIconFancy } from "../icons/faction-icon-fancy";
import PackIcon from "../icons/pack-icon";
import SlotIcon from "../icons/slot-icon";
import css from "./grouphead.module.css";

type Props = {
  className?: string;
  grouping: CardGroup;
  metadata: Metadata;
  variant?: "alt";
};

export function Grouphead(props: Props) {
  const { className, grouping, metadata, variant } = props;
  const keys = grouping.key.split("|");
  const types = grouping.type.split("|");

  return (
    <h3 className={cx(css["grouphead"], variant && css[variant], className)}>
      {keys.map((key, i) => {
        const type = types[i];

        if (type === "slot" && !keys.includes("asset")) {
          return null;
        }

        return (
          <GroupLabel
            // biome-ignore lint/suspicious/noArrayIndexKey: order is stable.
            key={i}
            metadata={metadata}
            segment={key}
            type={type}
          />
        );
      })}
    </h3>
  );
}

type GroupLabelProps = {
  className?: string;
  metadata: Metadata;
  segment: string;
  slot?: React.ReactNode;
  type: string;
};

export function GroupLabel(props: GroupLabelProps) {
  const { className, type, segment, metadata } = props;
  const keyLabel = getGroupingKeyLabel(type, segment, metadata);
  if (!keyLabel) return null;

  if (
    type === "none" ||
    type === "subtype" ||
    type === "type" ||
    type === "level" ||
    type === "cost" ||
    type === "base_upgrades"
  ) {
    return <span>{keyLabel}</span>;
  }

  if (type === "cycle") {
    return (
      <span className={className}>
        <PackIcon className={css["icon"]} code={segment} />
        <a
          className="link-current"
          href={`/browse/cycle/${segment}`}
          target="_blank"
          rel="noreferrer"
        >
          {keyLabel}
        </a>
      </span>
    );
  }

  if (type === "encounter_set") {
    return (
      <span className={className}>
        <EncounterIcon className={css["icon"]} code={segment} />
        <Link
          className="link-current"
          href={`/browse/encounter_set/${segment}`}
        >
          {keyLabel}
        </Link>
      </span>
    );
  }

  if (type === "slot") {
    if (segment === NONE) {
      return <span className={className}>{keyLabel}</span>;
    }

    if (segment === "permanent") {
      return <span className={className}>{keyLabel}</span>;
    }

    return (
      <span className={className}>
        {splitMultiValue(segment).map((slot) => (
          <SlotIcon key={slot} code={slot} />
        ))}
        <span>{keyLabel}</span>
      </span>
    );
  }

  if (type === "faction") {
    return (
      <span className={className}>
        <FactionIconFancy className={css["icon"]} code={segment} />
        <span>{keyLabel}</span>
      </span>
    );
  }

  if (type === "pack") {
    return (
      <span className={className}>
        <PackIcon className={css["icon"]} code={segment} />
        <Link className="link-current" href={`/browse/pack/${segment}`}>
          {keyLabel}
        </Link>
      </span>
    );
  }

  return null;
}
