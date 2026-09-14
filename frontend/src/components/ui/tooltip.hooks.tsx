import {
  autoPlacement,
  flip,
  offset,
  type Placement,
  type ReferenceType,
  shift,
  type UseFloatingOptions,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

export interface TooltipOptions {
  delay?: number;
  initialOpen?: boolean;
  placement?: Placement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  paused?: boolean;
}

export function useTooltip({
  delay,
  initialOpen = false,
  placement = "top",
  open: controlledOpen,
  onOpenChange,
  paused,
}: TooltipOptions = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen);

  const open = !paused && (controlledOpen ?? uncontrolledOpen);

  const setOpen = (value: boolean) => {
    if (controlledOpen == null) setUncontrolledOpen(value);
    onOpenChange?.(value);
  };

  const data = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    middleware: [
      offset(5),
      flip({
        crossAxis: placement.includes("-"),
        fallbackAxisSideDirection: "start",
        padding: 5,
      }),
      shift({ padding: 5 }),
    ],
  });

  const context = data.context;

  const hover = useHover(context, {
    delay: {
      open: delay,
      close: 0,
    },
    move: false,
    enabled: !paused && controlledOpen == null,
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const interactions = useInteractions([hover, dismiss, role]);

  return {
    open,
    setOpen,
    ...interactions,
    ...data,
  };
}

export function useRestingTooltip(
  options?: UseFloatingOptions<ReferenceType> & {
    delay?: number;
  },
) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const restTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [suppressUntilLeave, setSuppressUntilLeave] = useState(false);

  useEffect(
    () => () => {
      if (restTimeoutRef.current) clearTimeout(restTimeoutRef.current);
    },
    [],
  );

  const { context, refs, floatingStyles } = useFloating({
    open: tooltipOpen,
    onOpenChange: setTooltipOpen,
    middleware: [shift(), autoPlacement(), offset(2)],
    strategy: "fixed",
    placement: "bottom-start",
    ...options,
  });

  const { isMounted, styles } = useTransitionStyles(context, {
    duration: {
      open: 250,
      close: 50,
    },
  });

  const closeTooltip = () => {
    setSuppressUntilLeave(true);
    clearTimeout(restTimeoutRef.current);
    setTooltipOpen(false);
  };

  const onPointerDown = () => {
    setSuppressUntilLeave(true);
    clearTimeout(restTimeoutRef.current);
  };

  const onPointerLeave = () => {
    setSuppressUntilLeave(false);
    clearTimeout(restTimeoutRef.current);
    setTooltipOpen(false);
  };

  const onPointerMove = () => {
    if (suppressUntilLeave || tooltipOpen) return;

    clearTimeout(restTimeoutRef.current);

    restTimeoutRef.current = setTimeout(() => {
      setTooltipOpen(true);
    }, options?.delay ?? 25);
  };

  // Safari may cancel the subsequent click if pointerdown changes the DOM or
  // hit testing. Opacity hides the tooltip without affecting either.
  const transitionStyles = suppressUntilLeave
    ? { ...styles, opacity: 0 }
    : styles;

  const referenceProps = {
    onPointerDown,
    onPointerLeave,
    onPointerMove,
    onMouseLeave: onPointerLeave,
  };

  const value = {
    isMounted,
    referenceProps,
    refs,
    floatingStyles,
    transitionStyles,
    closeTooltip,
    setTooltipOpen,
  };

  return value;
}

type ContextType = ReturnType<typeof useTooltip> | undefined;

export const TooltipContext = createContext<ContextType>(undefined);

export const useTooltipContext = () => {
  const context = useContext(TooltipContext);

  if (context == null) {
    throw new Error("Tooltip components must be wrapped in <Tooltip />");
  }

  return context;
};
