import { useCardModalContext } from "@/components/card-modal/card-modal-context";
import { CardTooltip } from "@/components/card-tooltip";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";
import type { Card } from "@/store/services/queries.types";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import { FloatingPortal, shift } from "@floating-ui/react";
import { useCallback } from "react";
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
  const modalContext = useCardModalContext();

  const openModal = useCallback(() => {
    if (modalContext) {
      modalContext.setOpen({
        code: card.code,
      });
    }
  }, [card.code, modalContext]);

  return (
    <li className={css["signature"]} key={card.code}>
      <button {...tooltip.referenceProps} onClick={openModal}>
        {card.real_name}
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
