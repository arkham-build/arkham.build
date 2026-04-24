import type {
  TabsProps as RootProps,
  TabsContentProps,
  TabsListProps,
  TabsTriggerProps,
} from "@radix-ui/react-tabs";
import { Content, List, Root, Trigger } from "@radix-ui/react-tabs";
import { useCallback } from "react";
import { cx } from "@/utils/cx";
import { useHotkey } from "@/utils/use-hotkey";
import { Button } from "./button";
import { HotkeyTooltip } from "./hotkey";
import css from "./tabs.module.css";

type TabsProps = RootProps & {
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
};

export function Tabs({ children, className, ref, ...rest }: TabsProps) {
  return (
    <Root {...rest} className={cx(css["tabs"], className)} ref={ref}>
      {children}
    </Root>
  );
}

type ListProps = TabsListProps & {
  children: React.ReactNode;
  className?: string;
  vertical?: boolean;
  style?: React.CSSProperties;
};

export function TabsList({
  children,
  className,
  vertical,
  ...rest
}: ListProps) {
  return (
    <List
      data-testid="tabs-list"
      className={cx(css["list"], vertical && css["vertical"], className)}
      {...rest}
    >
      {children}
    </List>
  );
}

type TriggerProps = TabsTriggerProps & {
  children: React.ReactNode;
  className?: string;
  hotkey?: string;
  iconOnly?: boolean;
  onTabChange?: (value: string) => void;
  ref?: React.Ref<HTMLButtonElement>;
  tooltip?: string;
};

export function TabsTrigger({
  children,
  className,
  hotkey,
  iconOnly,
  onTabChange,
  ref,
  tooltip,
  value,
  ...rest
}: TriggerProps) {
  const inner = (
    <Trigger {...rest} asChild value={value}>
      <Button
        className={cx(css["trigger"], iconOnly && css["icon-only"], className)}
        ref={ref}
        iconOnly={iconOnly}
        tooltip={hotkey ? undefined : tooltip}
        variant="bare"
        size="none"
      >
        {children}
      </Button>
    </Trigger>
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

type ContentProps = TabsContentProps & {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function TabsContent({
  children,
  className,
  forceMount,
  ...rest
}: ContentProps) {
  return (
    <Content
      className={cx(
        css["content"],
        className,
        forceMount != null && css["mounted"],
      )}
      forceMount={forceMount}
      {...rest}
      tabIndex={-1}
    >
      {children}
    </Content>
  );
}
