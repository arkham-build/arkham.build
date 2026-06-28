import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactElement,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  Ref,
} from "react";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useMemo,
} from "react";
import { assert } from "@/utils/assert";
import { cx } from "@/utils/cx";
import { useHotkey } from "@/utils/use-hotkey";
import { Button } from "./button";
import { HotkeyTooltip } from "./hotkey";
import css from "./tabs.module.css";

type TabsContextValue = {
  baseId: string;
  onValueChange: (value: string) => void;
  value: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  onValueChange: (value: string) => void;
  ref?: Ref<HTMLDivElement>;
  value: string;
};

export function Tabs({
  children,
  className,
  onValueChange,
  ref,
  value,
  ...rest
}: TabsProps) {
  const baseId = useId();
  const context = useMemo(
    () => ({ baseId, onValueChange, value }),
    [baseId, onValueChange, value],
  );

  return (
    <TabsContext value={context}>
      <div
        data-orientation="horizontal"
        {...rest}
        className={cx(css["tabs"], className)}
        ref={ref}
      >
        {children}
      </div>
    </TabsContext>
  );
}

type ListProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  style?: CSSProperties;
  vertical?: boolean;
};

export function TabsList({
  children,
  className,
  onKeyDown,
  ref,
  vertical,
  ...rest
}: ListProps) {
  const handleKeyDown = useCallback(
    (evt: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(evt);
      if (evt.defaultPrevented) return;

      const target = evt.target;
      if (!(target instanceof HTMLElement)) return;

      const currentTab = target.closest<HTMLElement>("[role='tab']");
      if (!currentTab || !evt.currentTarget.contains(currentTab)) return;

      const nextIndex = getNextTabIndex(
        evt.key,
        getEnabledTabs(evt.currentTarget),
        currentTab,
      );
      if (nextIndex == null) return;

      evt.preventDefault();
      getEnabledTabs(evt.currentTarget)[nextIndex]?.focus();
    },
    [onKeyDown],
  );

  return (
    <div
      {...rest}
      aria-orientation={vertical ? "vertical" : "horizontal"}
      className={cx(css["list"], vertical && css["vertical"], className)}
      data-testid="tabs-list"
      onKeyDown={handleKeyDown}
      ref={ref}
      role="tablist"
    >
      {children}
    </div>
  );
}

type TriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> & {
  children: ReactNode;
  className?: string;
  hotkey?: string;
  iconOnly?: boolean;
  onTabChange?: (value: string) => void;
  ref?: Ref<HTMLButtonElement>;
  tooltip?: string;
  value: string;
};

export function TabsTrigger({
  children,
  className,
  disabled,
  hotkey,
  iconOnly,
  onFocus,
  onKeyDown,
  onMouseDown,
  onTabChange,
  ref,
  tooltip,
  value,
  ...rest
}: TriggerProps) {
  const context = useTabsContext("TabsTrigger");
  const selected = value === context.value;
  const triggerId = makeTriggerId(context.baseId, value);
  const contentId = makeContentId(context.baseId, value);
  const { onValueChange } = context;

  const selectTab = useCallback(() => {
    onValueChange(value);
  }, [onValueChange, value]);

  const handleMouseDown = useCallback(
    (evt: ReactMouseEvent<HTMLButtonElement>) => {
      onMouseDown?.(evt);
      if (evt.defaultPrevented) return;

      if (disabled || evt.button !== 0 || evt.ctrlKey) {
        evt.preventDefault();
        return;
      }

      selectTab();
    },
    [disabled, onMouseDown, selectTab],
  );

  const handleKeyDown = useCallback(
    (evt: ReactKeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(evt);
      if (evt.defaultPrevented) return;

      if (evt.key === " " || evt.key === "Enter") {
        evt.preventDefault();
        selectTab();
      }
    },
    [onKeyDown, selectTab],
  );

  const handleFocus = useCallback(
    (evt: ReactFocusEvent<HTMLButtonElement>) => {
      onFocus?.(evt);
      if (!selected && !disabled) {
        selectTab();
      }
    },
    [disabled, onFocus, selected, selectTab],
  );

  const inner = (
    <Button
      {...rest}
      aria-controls={contentId}
      aria-selected={selected}
      className={cx(css["trigger"], iconOnly && css["icon-only"], className)}
      data-disabled={disabled ? "" : undefined}
      data-state={selected ? "active" : "inactive"}
      disabled={disabled}
      iconOnly={iconOnly}
      id={triggerId}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      ref={ref}
      role="tab"
      size="none"
      tabIndex={selected ? 0 : -1}
      tooltip={hotkey ? undefined : tooltip}
      variant="bare"
    >
      {children}
    </Button>
  );

  const onHotkey = useCallback(() => {
    onTabChange?.(value);
  }, [value, onTabChange]);

  useHotkey(hotkey, onHotkey);

  return hotkey ? (
    <HotkeyTooltip keybind={hotkey} description={tooltip ?? value}>
      {inner}
    </HotkeyTooltip>
  ) : (
    inner
  );
}

type ContentProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  asChild?: boolean;
  children: ReactNode;
  className?: string;
  forceMount?: true;
  ref?: Ref<HTMLDivElement>;
  value: string;
};

type ContentElementProps = HTMLAttributes<HTMLDivElement> & {
  "data-orientation": "horizontal";
  "data-state": "active" | "inactive";
};

export function TabsContent({
  asChild,
  children,
  className,
  forceMount,
  ref,
  value,
  ...rest
}: ContentProps) {
  const context = useTabsContext("TabsContent");
  const selected = value === context.value;
  const mounted = selected || forceMount === true;
  const contentProps = {
    ...rest,
    "aria-labelledby": makeTriggerId(context.baseId, value),
    className: cx(
      css["content"],
      className,
      forceMount != null && css["mounted"],
    ),
    "data-orientation": "horizontal",
    "data-state": selected ? "active" : "inactive",
    hidden: !mounted,
    id: makeContentId(context.baseId, value),
    role: "tabpanel",
    tabIndex: -1,
  } satisfies ContentElementProps;

  if (asChild) {
    if (!mounted) return null;
    return renderAsChild(children, contentProps);
  }

  return (
    <div {...contentProps} ref={ref}>
      {mounted && children}
    </div>
  );
}

function useTabsContext(component: string) {
  const context = useContext(TabsContext);
  assert(context, `${component} must be used within Tabs`);
  return context;
}

function getEnabledTabs(list: HTMLElement) {
  return Array.from(list.querySelectorAll<HTMLElement>("[role='tab']")).filter(
    (tab) => !tab.hasAttribute("disabled"),
  );
}

function getNextTabIndex(
  key: string,
  tabs: HTMLElement[],
  currentTab: HTMLElement,
) {
  if (!tabs.length) return null;

  const index = tabs.indexOf(currentTab);
  if (index === -1) return null;

  switch (key) {
    case "ArrowLeft":
    case "ArrowUp":
      return (index - 1 + tabs.length) % tabs.length;
    case "ArrowRight":
    case "ArrowDown":
      return (index + 1) % tabs.length;
    case "Home":
      return 0;
    case "End":
      return tabs.length - 1;
    default:
      return null;
  }
}

function renderAsChild(children: ReactNode, props: ContentElementProps) {
  const child = Children.only(children);
  assert(isValidElement(child), "TabsContent asChild expects one element");

  const childProps = child.props as {
    className?: string;
    style?: CSSProperties;
  };

  return cloneElement(child as ReactElement<Record<string, unknown>>, {
    ...props,
    className: cx(props.className, childProps.className),
    style: { ...props.style, ...childProps.style },
  });
}

function makeTriggerId(baseId: string, value: string) {
  return `${baseId}-trigger-${value}`;
}

function makeContentId(baseId: string, value: string) {
  return `${baseId}-content-${value}`;
}
