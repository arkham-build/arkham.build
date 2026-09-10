import {
  autoPlacement,
  autoUpdate,
  FloatingPortal,
  offset,
  shift,
  useFloating,
  useTransitionStyles,
} from "@floating-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
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

  const { context, refs, floatingStyles } = useFloating({
    open: !!cardTooltip,
    onOpenChange: () => setCardTooltip(""),
    middleware: [shift(), autoPlacement(), offset(2)],
    whileElementsMounted: autoUpdate,
    strategy: "fixed",
    placement: "bottom-start",
  });

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  const closeTooltip = useCallback(() => {
    clearTimeout(restTimeoutRef.current);
    setCardTooltip("");
  }, []);

  const onPointerDown = useCallback(() => {
    suppressUntilLeaveRef.current = true;
    closeTooltip();
  }, [closeTooltip]);

  const onPointerLeave = useCallback(() => {
    suppressUntilLeaveRef.current = false;
    closeTooltip();
  }, [closeTooltip]);

  const onPointerMove = useCallback(
    (evt: React.PointerEvent) => {
      if (suppressUntilLeaveRef.current) return;

      const anchor = (evt.target as HTMLElement)?.closest("a");

      if (anchor instanceof HTMLAnchorElement) {
        const code = /\/card\/(.*)$/.exec(anchor.href)?.[1];

        if (code) {
          clearTimeout(restTimeoutRef.current);

          const rect = anchor.getBoundingClientRect();
          refs.setPositionReference({
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
    },
    [refs, closeTooltip, cardTooltip],
  );

  const referenceProps = useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerLeave,
    }),
    [onPointerDown, onPointerMove, onPointerLeave],
  );

  const cardLinkTooltip = isMounted && cardTooltip && (
    <FloatingPortal id={FLOATING_PORTAL_ID}>
      <div
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          ...transitionStyles,
          pointerEvents: "none",
        }}
      >
        <CardTooltip code={cardTooltip} />
      </div>
    </FloatingPortal>
  );

  return {
    cardLinkTooltip,
    referenceProps,
  };
}
