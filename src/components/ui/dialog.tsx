import { FLOATING_PORTAL_ID } from "@/utils/constants";
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useMergeRefs,
  useTransitionStyles,
} from "@floating-ui/react";
import { cloneElement, forwardRef, isValidElement } from "react";
import type { DialogOptions } from "./dialog.hooks";
import {
  DialogContext,
  useDialog,
  useDialogContextChecked,
} from "./dialog.hooks";

export function Dialog({
  children,
  ...options
}: {
  children: React.ReactNode;
} & DialogOptions) {
  const dialog = useDialog(options);
  return (
    <DialogContext.Provider value={dialog}>{children}</DialogContext.Provider>
  );
}

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const DialogTrigger = forwardRef<
  HTMLElement,
  React.HTMLProps<HTMLElement> & DialogTriggerProps
>(function DialogTrigger({ children, asChild = false, ...props }, propRef) {
  const context = useDialogContextChecked();
  // biome-ignore lint/suspicious/noExplicitAny: safe.
  const childrenRef = (children as any).ref;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && isValidElement(children)) {
    return cloneElement(
      children as React.ReactElement,
      context.getReferenceProps({
        ref,
        ...props,
        ...(children as React.ReactElement).props,
        "data-state": context.open ? "open" : "closed",
      } as React.HTMLProps<Element>),
    );
  }

  return (
    <div
      data-state={context.open ? "open" : "closed"}
      ref={ref}
      {...context.getReferenceProps(props as React.HTMLProps<Element>)}
    >
      {children}
    </div>
  );
});

export const DialogContent = forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLElement>
>(function DialogContent(props, propRef) {
  const { context: floatingContext, ...context } = useDialogContextChecked();
  const { isMounted, styles } = useTransitionStyles(floatingContext);
  const ref = useMergeRefs([
    context.refs.setFloating,
    propRef,
  ] as React.Ref<HTMLDivElement>[]);

  if (!isMounted) return null;

  return (
    <FloatingPortal id={FLOATING_PORTAL_ID}>
      <FloatingOverlay lockScroll>
        <FloatingFocusManager
          context={floatingContext}
          // biome-ignore lint/suspicious/noExplicitAny: bad library type
          initialFocus={context.refs.setFloating as any}
        >
          <div
            {...context.getFloatingProps(props)}
            aria-describedby={context.descriptionId}
            aria-labelledby={context.labelId}
            ref={ref}
          >
            <div style={styles}>{props.children}</div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
});
