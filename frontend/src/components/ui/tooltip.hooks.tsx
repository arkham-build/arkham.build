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
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

  const setOpen = useCallback(
    (value: boolean) => {
      if (controlledOpen == null) setUncontrolledOpen(value);
      onOpenChange?.(value);
    },
    [controlledOpen, onOpenChange],
  );

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

  return useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
    }),
    [open, setOpen, interactions, data],
  );
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
  const suppressUntilLeaveRef = useRef(false);

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

  const closeTooltip = useCallback(() => {
    suppressUntilLeaveRef.current = true;
    clearTimeout(restTimeoutRef.current);
    setTooltipOpen(false);
  }, []);

  const onPointerDown = useCallback(() => {
    suppressUntilLeaveRef.current = true;
    clearTimeout(restTimeoutRef.current);

    // Safari may cancel the subsequent click if pointerdown changes the DOM or
    // hit testing. Opacity hides the tooltip without affecting either.
    const floatingElement = refs.floating.current;
    if (floatingElement) floatingElement.style.opacity = "0";
  }, [refs.floating]);

  const onPointerLeave = useCallback(() => {
    suppressUntilLeaveRef.current = false;
    clearTimeout(restTimeoutRef.current);
    setTooltipOpen(false);
  }, []);

  const onPointerMove = useCallback(() => {
    if (suppressUntilLeaveRef.current || tooltipOpen) return;

    clearTimeout(restTimeoutRef.current);

    restTimeoutRef.current = setTimeout(() => {
      setTooltipOpen(true);
    }, options?.delay ?? 25);
  }, [tooltipOpen, options?.delay]);

  const referenceProps = useMemo(
    () => ({
      onPointerDown,
      onPointerLeave,
      onPointerMove,
      onMouseLeave: onPointerLeave,
    }),
    [onPointerDown, onPointerLeave, onPointerMove],
  );

  const value = useMemo(
    () => ({
      isMounted,
      referenceProps,
      refs,
      floatingStyles,
      transitionStyles: styles,
      closeTooltip,
      setTooltipOpen,
    }),
    [referenceProps, refs, styles, floatingStyles, isMounted, closeTooltip],
  );

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
