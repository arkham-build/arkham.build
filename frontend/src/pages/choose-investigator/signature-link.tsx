import { FloatingPortal, shift } from "@floating-ui/react";
import { useCallback } from "react";
import { CardTooltip } from "@/components/card-tooltip/card-tooltip";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";
import { useStore } from "@/store";
import type { Card } from "@/store/schemas/card.schema";
import { displayAttribute } from "@/utils/card-utils";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import css from "./choose-investigator.module.css";

type Props = {
  card: Card;
  signaturesRef: React.RefObject<HTMLElement>;
};

export function SignatureLink(props: Props) {
  const { card, signaturesRef } = props;

  const tooltip = useRestingTooltip({
    elements: {
      reference: signaturesRef?.current,
    },
    middleware: [shift({ padding: 5 })],
    placement: "right",
  });

  const openCardModal = useStore((state) => state.openCardModal);

  const openModal = useCallback(() => {
    openCardModal(card.code);
  }, [card.code, openCardModal]);

  return (
    <li className={css["signature"]} key={card.code}>
      <button {...tooltip.referenceProps} onClick={openModal}>
        {displayAttribute(card, "name")}
      </button>
      {tooltip.isMounted && (
        <FloatingPortal id={FLOATING_PORTAL_ID}>
          <div ref={tooltip.refs.setFloating} style={tooltip.floatingStyles}>
            <div style={tooltip.transitionStyles}>
              <CardTooltip code={card.code} />
            </div>
          </div>
        </FloatingPortal>
      )}
    </li>
  );
}
