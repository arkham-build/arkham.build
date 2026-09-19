import type { Placement } from "@floating-ui/react";
import {
  autoUpdate,
  flip,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { createContext, useContext, useState } from "react";

export interface PopoverOptions {
  clickDisabled?: boolean;
  clickStickIfOpen?: boolean;
  hoverDisabled?: boolean;
  initialOpen?: boolean;
  placement?: Placement;
  modal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  strategy?: "absolute" | "fixed";
}

export function usePopover({
  clickDisabled,
  clickStickIfOpen,
  hoverDisabled,
  initialOpen = false,
  placement = "bottom",
  modal,
  open: controlledOpen,
  onOpenChange,
  ...rest
}: PopoverOptions = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen);
  const [labelId, setLabelId] = useState<string | undefined>();
  const [descriptionId, setDescriptionId] = useState<string | undefined>();

  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (value: boolean) => {
    if (controlledOpen == null) setUncontrolledOpen(value);
    onOpenChange?.(value);
  };

  const data = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(5),
      flip({
        crossAxis: placement.includes("-"),
        fallbackAxisSideDirection: "end",
        padding: 5,
      }),
      shift({ padding: 5 }),
    ],
    ...rest,
  });

  const context = data.context;

  const click = useClick(context, {
    enabled: !clickDisabled,
    stickIfOpen: clickStickIfOpen,
  });

  const hover = useHover(context, {
    enabled: !hoverDisabled,
    restMs: 50,
    handleClose: safePolygon({
      blockPointerEvents: false,
    }),
  });

  const dismiss = useDismiss(context);
  const role = useRole(context);

  const interactions = useInteractions([click, dismiss, role, hover]);

  return {
    open,
    setOpen,
    ...interactions,
    ...data,
    modal,
    labelId,
    descriptionId,
    setLabelId,
    setDescriptionId,
  };
}

type ContextType =
  | (ReturnType<typeof usePopover> & {
      setLabelId: React.Dispatch<React.SetStateAction<string | undefined>>;
      setDescriptionId: React.Dispatch<
        React.SetStateAction<string | undefined>
      >;
    })
  | undefined;

export const PopoverContext = createContext<ContextType>(undefined);

export const usePopoverContextChecked = () => {
  const context = useContext(PopoverContext);

  if (context == null) {
    throw new Error("Popover components must be wrapped in <Popover />");
  }

  return context;
};
