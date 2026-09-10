import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useMergeRefs,
  useTransitionStyles,
} from "@floating-ui/react";
import { cloneElement, isValidElement } from "react";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import type { DialogOptions } from "./dialog.hooks";
import {
  DialogContext,
  DialogTransitionStylesContext,
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
  return <DialogContext value={dialog}>{children}</DialogContext>;
}

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DialogTrigger({
  children,
  asChild = false,
  ref: propRef,
  ...props
}: React.HTMLProps<HTMLElement> & DialogTriggerProps) {
  const context = useDialogContextChecked();
  const childrenRef = isValidElement(children)
    ? (children.props as { ref?: React.Ref<unknown> }).ref
    : null;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && isValidElement(children)) {
    // oxlint-disable-next-line typescript/no-explicit-any -- safe.
    const { ref: _, ...childProps } = (children as React.ReactElement<any>)
      .props;
    return cloneElement(
      children as React.ReactElement,
      context.getReferenceProps({
        ref,
        ...props,
        ...childProps,
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
}

export function DialogContent(props: React.HTMLProps<HTMLElement>) {
  const { context: floatingContext, ...context } = useDialogContextChecked();

  const { isMounted, styles } = useTransitionStyles(floatingContext, {
    duration: 250,
    common: {
      transitionProperty: "opacity, backdrop-filter",
      willChange: "opacity, backdrop-filter",
    },
    initial: {
      opacity: 0,
      backdropFilter: "blur(0px)",
    },
    open: {
      opacity: 1,
      backdropFilter: "blur(1.25px)",
    },
  });

  const ref = useMergeRefs([
    context.refs.setFloating,
    props.ref,
  ] as React.Ref<HTMLDivElement>[]);

  if (!isMounted) return null;

  return (
    <FloatingPortal id={FLOATING_PORTAL_ID}>
      <FloatingOverlay
        lockScroll
        style={{ pointerEvents: context.open ? undefined : "none" }}
      >
        <FloatingFocusManager context={floatingContext}>
          <div
            {...context.getFloatingProps(props)}
            aria-describedby={context.descriptionId}
            ref={ref}
          >
            <DialogTransitionStylesContext value={styles}>
              {props.children}
            </DialogTransitionStylesContext>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
