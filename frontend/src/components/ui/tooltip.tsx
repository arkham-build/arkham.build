import { FloatingPortal, useMergeRefs } from "@floating-ui/react";
import { cloneElement, isValidElement, memo } from "react";
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

  return <TooltipContext value={tooltip}>{children}</TooltipContext>;
});

export function TooltipTrigger({
  children,
  asChild = false,
  ref: propRef,
  ...props
}: React.HTMLProps<HTMLElement> & {
  asChild?: boolean;
}) {
  const context = useTooltipContext();
  const childrenRef = isValidElement(children)
    ? (children.props as { ref?: React.Ref<unknown> }).ref
    : null;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && isValidElement(children)) {
    // biome-ignore lint/suspicious/noExplicitAny: safe.
    const { ref: _, ...childProps } = (children as React.ReactElement<any>)
      .props;
    return cloneElement(
      children as React.ReactElement,
      context.getReferenceProps({
        ref,
        ...props,
        ...childProps,
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
}

export function TooltipContent({
  ref: propRef,
  style,
  ...props
}: React.HTMLProps<HTMLElement>) {
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
}

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

  // we don't want to show tooltips on mobile.
  // on iOS, this leads to each button with a tooltip having to be clicked twice.
  if (window.matchMedia("(any-hover: none)").matches) {
    return children;
  }

  return (
    <Tooltip
      delay={150}
      {...options}
      paused={paused || options?.paused || !tooltip}
    >
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className={className}>{tooltip}</TooltipContent>
    </Tooltip>
  );
});
