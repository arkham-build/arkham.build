import {
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { createContext, useContext, useState } from "react";

export interface DialogOptions {
  initialOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ContextType =
  | (ReturnType<typeof useDialog> & {
      setLabelId: React.Dispatch<React.SetStateAction<string | undefined>>;
      setDescriptionId: React.Dispatch<
        React.SetStateAction<string | undefined>
      >;
    })
  | undefined;

export const DialogContext = createContext<ContextType>(undefined);
export const DialogTransitionStylesContext = createContext<
  React.CSSProperties | undefined
>(undefined);

export const useDialogTransitionStyles = () => {
  return useContext(DialogTransitionStylesContext);
};

export const useDialogContextChecked = () => {
  const context = useContext(DialogContext);

  if (context == null) {
    throw new Error("Dialog components must be wrapped in <Dialog />");
  }

  return context;
};

export const useDialogContext = () => {
  return useContext(DialogContext);
};

export function useDialog({
  initialOpen = false,
  open: controlledOpen,
  onOpenChange,
}: DialogOptions = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen);
  const [labelId, setLabelId] = useState<string | undefined>();
  const [descriptionId, setDescriptionId] = useState<string | undefined>();

  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (value: boolean) => {
    if (controlledOpen == null) setUncontrolledOpen(value);
    onOpenChange?.(value);
  };

  const data = useFloating({
    open,
    onOpenChange: setOpen,
  });

  const context = data.context;

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const interactions = useInteractions([click, dismiss, role]);

  return {
    open,
    setOpen,
    ...interactions,
    ...data,
    labelId,
    descriptionId,
    setLabelId,
    setDescriptionId,
  };
}
