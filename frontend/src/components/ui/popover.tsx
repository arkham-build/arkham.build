import {
  FloatingFocusManager,
  FloatingPortal,
  useMergeRefs,
  useTransitionStyles,
} from "@floating-ui/react";
import { cloneElement, isValidElement } from "react";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import type { PopoverOptions } from "./popover.hooks";
import {
  PopoverContext,
  usePopover,
  usePopoverContextChecked,
} from "./popover.hooks";

export function Popover({
  children,
  modal = false,
  ...restOptions
}: {
  children: React.ReactNode;
} & PopoverOptions) {
  // This can accept any props as options, e.g. `placement`,
  // or other positioning options.
  const popover = usePopover({ modal, ...restOptions });

  return <PopoverContext value={popover}>{children}</PopoverContext>;
}

interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function PopoverTrigger({
  children,
  asChild = false,
  ref: propRef,
  ...props
}: React.HTMLProps<HTMLElement> & PopoverTriggerProps) {
  const context = usePopoverContextChecked();
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
        // biome-ignore lint/suspicious/noExplicitAny: safe.
        ...(children as React.ReactElement<any>).props,
        "data-state": context.open ? "open" : "closed",
      } as React.HTMLProps<Element>),
    );
  }

  return (
    <button
      data-state={context.open ? "open" : "closed"}
      ref={ref}
      type="button"
      {...context.getReferenceProps(props as React.HTMLProps<Element>)}
    >
      {children}
    </button>
  );
}

export function PopoverContent({
  ref: propRef,
  style,
  ...props
}: React.HTMLProps<HTMLElement>) {
  const { context: floatingContext, ...context } = usePopoverContextChecked();

  const { isMounted, styles } = useTransitionStyles(floatingContext, {
    duration: 150,
  });

  const ref = useMergeRefs([
    context.refs.setFloating,
    propRef,
  ] as React.Ref<HTMLDivElement>[]);

  if (!isMounted) return null;

  return (
    <FloatingPortal id={FLOATING_PORTAL_ID}>
      <FloatingFocusManager
        context={floatingContext}
        modal={context.modal}
        initialFocus={-1}
      >
        <div
          aria-describedby={context.descriptionId}
          ref={ref}
          style={{
            ...context.floatingStyles,
            ...(style as React.CSSProperties),
          }}
          {...context.getFloatingProps(props)}
        >
          <div style={styles}>{props.children}</div>
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
