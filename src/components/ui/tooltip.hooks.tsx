import {
  type Placement,
  type ReferenceType,
  type UseFloatingOptions,
  autoPlacement,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
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
}

export function useTooltip({
  delay,
  initialOpen = false,
  placement = "top",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: TooltipOptions = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;

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
    enabled: controlledOpen == null,
  });

  const focus = useFocus(context, {
    enabled: controlledOpen == null,
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const interactions = useInteractions([hover, focus, dismiss, role]);

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
  const restTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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

  const onPointerLeave = useCallback(() => {
    clearTimeout(restTimeoutRef.current);
    setTooltipOpen(false);
  }, []);

  const onPointerMove = useCallback(() => {
    if (tooltipOpen) return;

    clearTimeout(restTimeoutRef.current);

    restTimeoutRef.current = setTimeout(() => {
      setTooltipOpen(true);
    }, options?.delay ?? 25);
  }, [tooltipOpen, options?.delay]);

  const referenceProps = useMemo(
    () => ({
      onPointerLeave,
      onPointerMove,
      onMouseLeave: onPointerLeave,
    }),
    [onPointerLeave, onPointerMove],
  );

  const value = useMemo(
    () => ({
      isMounted,
      referenceProps,
      refs,
      floatingStyles,
      transitionStyles: styles,
    }),
    [referenceProps, refs, styles, floatingStyles, isMounted],
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
