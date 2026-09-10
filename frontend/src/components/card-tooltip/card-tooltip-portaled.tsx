import type { Card } from "@arkham-build/shared";
import { FloatingPortal } from "@floating-ui/react";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import { CardTooltip } from "./card-tooltip";

type Props = {
  card: Card;
  floatingStyles: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
  transitionStyles: React.CSSProperties;
  tooltip?: React.ReactNode;
};

export function PortaledCardTooltip(props: Props) {
  const { card, floatingStyles, ref, transitionStyles, tooltip } = props;

  return (
    <FloatingPortal id={FLOATING_PORTAL_ID}>
      <div ref={ref} style={floatingStyles}>
        <div style={transitionStyles}>
          {tooltip ?? <CardTooltip code={card.code} />}
        </div>
      </div>
    </FloatingPortal>
  );
}
