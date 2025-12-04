import { FloatingPortal } from "@floating-ui/react";
import { forwardRef } from "react";
import type { Card } from "@/store/schemas/card.schema";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import { CardTooltip } from "./card-tooltip";

type Props = {
  card: Card;
  floatingStyles: React.CSSProperties;
  transitionStyles: React.CSSProperties;
  tooltip?: React.ReactNode;
};

export const PortaledCardTooltip = forwardRef(function PortaledCardTooltip(
  props: Props,
  ref: React.Ref<HTMLDivElement>,
) {
  const { card, floatingStyles, transitionStyles, tooltip } = props;

  return (
    <FloatingPortal id={FLOATING_PORTAL_ID}>
      <div ref={ref} style={floatingStyles}>
        <div style={transitionStyles}>
          {tooltip ?? <CardTooltip code={card.code} />}
        </div>
      </div>
    </FloatingPortal>
  );
});
