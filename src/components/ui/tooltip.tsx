import { FloatingPortal, useMergeRefs } from "@floating-ui/react";
import { cloneElement, forwardRef, isValidElement, memo } from "react";
import { cx } from "@/utils/cx";
import {
  TooltipContext,
  type TooltipOptions,
  useTooltip,
  useTooltipContext,
} from "./tooltip.hooks";
import css from "./tooltip.module.css";

export const Tooltip = memo(function Tooltip({
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
});

export const TooltipTrigger = forwardRef<
  HTMLElement,
  React.HTMLProps<HTMLElement> & { asChild?: boolean }
>(function TooltipTrigger({ children, asChild = false, ...props }, propRef) {
  const context = useTooltipContext();
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
        "data-tooltip-state": context.open ? "open" : "closed",
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

export const TooltipContent = forwardRef<
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
        {...context.getFloatingProps(props)}
        className={cx(css["content"], props.className)}
        ref={ref}
        style={{
          ...context.floatingStyles,
          ...(style as React.CSSProperties),
        }}
      />
    </FloatingPortal>
  );
});

export type DefaultTooltipProps = {
  // Don't accept arrays of items or nullish values
  children: NonNullable<Exclude<React.ReactNode, Iterable<React.ReactNode>>>;
  className?: string;
  tooltip?: React.ReactNode;
  options?: TooltipOptions;
  paused?: boolean;
};

export const DefaultTooltip = memo(function DefaultTooltip(
  props: DefaultTooltipProps,
) {
  const { children, className, options, paused, tooltip } = props;

  if (!tooltip || paused) {
    return children;
  }

  // we don't want to show tooltips on mobile.
  // on iOS, this leads to each button with a tooltip having to be clicked twice.
  if (window.matchMedia("(any-hover: none)").matches) {
    return children;
  }

  return (
    <Tooltip delay={200} {...options}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className={className}>{tooltip}</TooltipContent>
    </Tooltip>
  );
});
