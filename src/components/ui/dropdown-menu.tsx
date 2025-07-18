import type { RadioGroupItemProps } from "@radix-ui/react-radio-group";
import { forwardRef } from "react";
import { cx } from "@/utils/cx";
import { Button, type Props as ButtonProps, type ButtonType } from "./button";
import css from "./dropdown-menu.module.css";
import { Keybind } from "./hotkey";
import { RadioGroupItem } from "./radio-group";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function DropdownMenu(props: Props) {
  const { children, className, ...rest } = props;
  return (
    <nav {...rest} className={cx(css["dropdown"], className)}>
      {children}
    </nav>
  );
}

export const DropdownButton = forwardRef(function DropdownButton<
  T extends ButtonType,
>(
  props: ButtonProps<T> & { hotkey?: string },
  ref: React.Ref<HTMLButtonElement>,
) {
  const { children, className, hotkey, ...rest } = props;

  const childNodes = hotkey ? (
    <span className={css["dropdown-button-row"]}>
      <span>{children}</span>
      <Keybind keybind={hotkey} />
    </span>
  ) : (
    children
  );

  return (
    <Button
      {...rest}
      ref={ref}
      className={cx(css["dropdown-button"], className)}
      variant="bare"
      size="full"
    >
      {childNodes}
    </Button>
  );
});

export function DropdownRadioGroupItem(
  props: RadioGroupItemProps & {
    hotkey?: string;
    value: string;
  },
) {
  const { children, className, hotkey, ...rest } = props;

  const childNodes = hotkey ? (
    <span className={css["dropdown-button-row"]}>
      <span>{children}</span>
      <Keybind keybind={hotkey} />
    </span>
  ) : (
    children
  );

  return (
    <RadioGroupItem {...rest} className={cx(css["dropdown-button"], className)}>
      {childNodes}
    </RadioGroupItem>
  );
}

export function DropdownMenuSection(props: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const { children, className, title } = props;

  return (
    <section className={cx(css["section"], className)}>
      <header className={css["header"]}>
        <h4 className={css["title"]}>{title}</h4>
      </header>
      <div className={css["content"]}>{children}</div>
    </section>
  );
}

export function DropdownItem({ children }: { children: React.ReactNode }) {
  return <div className={css["dropdown-item"]}>{children}</div>;
}
