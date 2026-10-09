import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useMergeRefs,
  useTransitionStyles,
} from "@floating-ui/react";
import { isValidElement } from "react";
import { FLOATING_PORTAL_ID, MQ_REDUCED_MOTION } from "@/utils/constants";
import { useMedia } from "@/utils/use-media";
import type { DialogOptions } from "./dialog.hooks";
import {
  DialogContext,
  DialogTransitionStylesContext,
  useDialog,
  useDialogContextChecked,
} from "./dialog.hooks";
import { dialogTransitionStyles } from "./transition-styles";

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
    const child = children as React.ReactElement<any>;
    const { ref: _, ...childProps } = child.props;
    const Child = child.type;

    const referenceProps = context.getReferenceProps({
      ...props,
      ...childProps,
      "data-state": context.open ? "open" : "closed",
    } as React.HTMLProps<Element>);

    return <Child key={child.key ?? undefined} {...referenceProps} ref={ref} />;
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

export function DialogContent({
  children,
  ref: propRef,
  ...props
}: React.HTMLProps<HTMLElement>) {
  const { context: floatingContext, ...context } = useDialogContextChecked();
  const reducedMotion = useMedia(MQ_REDUCED_MOTION);

  const { isMounted, styles } = useTransitionStyles(
    floatingContext,
    dialogTransitionStyles(reducedMotion),
  );

  const ref = useMergeRefs([
    context.refs.setFloating,
    propRef,
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
              {children}
            </DialogTransitionStylesContext>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
