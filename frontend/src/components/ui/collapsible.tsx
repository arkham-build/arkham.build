import type {
  CollapsibleContentProps,
  CollapsibleProps,
} from "@radix-ui/react-collapsible";
import { Content, Root, Trigger } from "@radix-ui/react-collapsible";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { Button } from "./button";
import css from "./collapsible.module.css";

interface Props extends Omit<CollapsibleProps, "title"> {
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  triggerReversed?: boolean;
  omitBorder?: boolean;
  omitPadding?: boolean;
  onOpenChange?: (x: boolean) => void;
  sub?: React.ReactNode;
  title: React.ReactNode;
  triggerClassName?: string;
  header?: React.ReactNode;
  variant?: "active";
}

export function Collapsible(props: Props) {
  const {
    actions,
    className,
    children,
    open,
    omitBorder,
    omitPadding,
    onOpenChange,
    sub,
    title,
    triggerClassName,
    triggerReversed,
    header,
    variant,
    ...rest
  } = props;

  const { t } = useTranslation();

  return (
    <Root
      {...rest}
      className={cx(
        css["collapsible"],
        !omitPadding && css["padded"],
        !omitBorder && css["bordered"],
        variant && css[variant],
        className,
      )}
      onOpenChange={onOpenChange}
      open={open}
    >
      <Trigger asChild>
        <div
          className={cx(
            css["trigger"],
            triggerReversed && css["reversed"],
            triggerClassName,
          )}
          data-testid="collapsible-trigger"
        >
          {header || (
            <div className={css["header"]}>
              <h4>{title}</h4>
              <div className={css["sub"]}>{sub}</div>
            </div>
          )}
          <div className={css["actions"]}>
            {actions}
            <Button
              iconOnly
              variant="bare"
              tooltip={
                open == null
                  ? t("ui.collapsible.toggle")
                  : open
                    ? t("ui.collapsible.collapse")
                    : t("ui.collapsible.expand")
              }
            >
              {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </Button>
          </div>
        </div>
      </Trigger>
      {children}
    </Root>
  );
}

type ContentProps = CollapsibleContentProps & {
  className?: string;
  children: React.ReactNode;
};

export function CollapsibleContent({ className, children }: ContentProps) {
  return (
    <Content>
      <div className={cx(css["content"], className)}>{children}</div>
    </Content>
  );
}
