import { FloatingPortal, useMergeRefs } from "@floating-ui/react";
import * as React from "react";

import {
  TooltipContext,
  type TooltipOptions,
  useTooltip,
  useTooltipContext,
} from "./tooltip.hooks";
import css from "./tooltip.module.css";

export function Tooltip({
  children,
  ...options
}: { children: React.ReactNode } & TooltipOptions) {
  // This can accept any props as options, e.g. `placement`,
  // or other positioning options.
  const tooltip = useTooltip(options);
  return (
    <TooltipContext.Provider value={tooltip}>
      {children}
    </TooltipContext.Provider>
  );
}

export const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLProps<HTMLElement> & { asChild?: boolean }
>(function TooltipTrigger({ children, asChild = false, ...props }, propRef) {
  const context = useTooltipContext();
  // biome-ignore lint/suspicious/noExplicitAny: safe.
  const childrenRef = (children as any).ref;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
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
    <button
      data-state={context.open ? "open" : "closed"}
      ref={ref}
      {...context.getReferenceProps(props as React.HTMLProps<Element>)}
    >
      {children}
    </button>
  );
});

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLElement>
  // eslint-disable-next-line react/prop-types
>(function TooltipContent({ style, ...props }, propRef) {
  const context = useTooltipContext();

  const ref = useMergeRefs([
    context.refs.setFloating,
    propRef,
  ] as React.Ref<HTMLDivElement>[]);

  if (!context.open) return null;

  return (
    <FloatingPortal>
      <div
        className={css["content"]}
        ref={ref}
        style={{
          ...context.floatingStyles,
          ...(style as React.CSSProperties),
        }}
        {...context.getFloatingProps(props)}
      />
    </FloatingPortal>
  );
});
