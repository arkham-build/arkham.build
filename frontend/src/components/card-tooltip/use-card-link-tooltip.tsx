import {
  autoPlacement,
  autoUpdate,
  FloatingPortal,
  offset,
  shift,
  useFloating,
  useTransitionStyles,
} from "@floating-ui/react";
import { useEffect, useRef, useState } from "react";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import { tooltipTransitionStyles } from "../ui/transition-styles";
import { CardTooltip } from "./card-tooltip";

export function useCardLinkTooltip() {
  const [cardTooltip, setCardTooltip] = useState<string>("");
  const restTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const suppressUntilLeaveRef = useRef(false);

  useEffect(
    () => () => {
      if (restTimeoutRef.current) clearTimeout(restTimeoutRef.current);
    },
    [],
  );

  const {
    context,
    refs: { setFloating, setPositionReference },
    floatingStyles,
  } = useFloating({
    open: !!cardTooltip,
    onOpenChange: () => setCardTooltip(""),
    middleware: [shift(), autoPlacement(), offset(2)],
    whileElementsMounted: autoUpdate,
    strategy: "fixed",
    placement: "bottom-start",
  });

  const { isMounted, styles: transitionStyles } = useTransitionStyles(
    context,
    tooltipTransitionStyles(),
  );

  const closeTooltip = () => {
    clearTimeout(restTimeoutRef.current);
    setCardTooltip("");
  };

  const onPointerDown = () => {
    suppressUntilLeaveRef.current = true;
    closeTooltip();
  };

  const onPointerLeave = () => {
    suppressUntilLeaveRef.current = false;
    closeTooltip();
  };

  const onPointerMove = (evt: React.PointerEvent) => {
    if (evt.pointerType === "touch" || suppressUntilLeaveRef.current) return;

    const anchor = (evt.target as HTMLElement)?.closest("a");

    if (anchor instanceof HTMLAnchorElement) {
      const code = /\/card\/(.*)$/.exec(anchor.href)?.[1];

      if (code) {
        clearTimeout(restTimeoutRef.current);

        const rect = anchor.getBoundingClientRect();
        setPositionReference({
          getBoundingClientRect: () => rect,
        });

        if (cardTooltip) {
          setCardTooltip(code);
        } else {
          restTimeoutRef.current = setTimeout(() => {
            setCardTooltip(code);
          }, 25);
        }
        return;
      }
    }

    closeTooltip();
  };

  const referenceProps = {
    onPointerDown,
    onPointerMove,
    onPointerLeave,
  };

  const cardLinkTooltip = isMounted && cardTooltip && (
    <FloatingPortal id={FLOATING_PORTAL_ID}>
      <div
        ref={setFloating}
        style={{ ...floatingStyles, pointerEvents: "none" }}
      >
        <div style={transitionStyles}>
          <CardTooltip code={cardTooltip} />
        </div>
      </div>
    </FloatingPortal>
  );

  return {
    cardLinkTooltip,
    referenceProps,
  };
}
