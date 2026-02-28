import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { Button } from "./button";
import css from "./collapsible.module.css";

type CollapsibleContextValue = {
  open: boolean;
  onToggle: () => void;
  contentId: string;
  triggerId: string;
};

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext() {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) throw new Error("Collapsible primitives must be used inside Root");
  return ctx;
}

export type CollapsibleRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  className?: string;
};

export function Root({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
  ...rest
}: CollapsibleRootProps & React.HTMLAttributes<HTMLElement>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);

  const isControlled = controlledOpen != null;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const id = useId();
  const contentId = `collapsible-content-${id}`;
  const triggerId = `collapsible-trigger-${id}`;

  const onToggle = useCallback(() => {
    if (!isControlled) setUncontrolledOpen((prev) => !prev);
    onOpenChange?.(!open);
  }, [open, isControlled, onOpenChange]);

  const contextValue = useMemo(
    () => ({ open, onToggle, contentId, triggerId }),
    [open, onToggle, contentId, triggerId],
  );

  return (
    <CollapsibleContext value={contextValue}>
      <div
        {...rest}
        className={className}
        data-state={open ? "open" : "closed"}
      >
        {children}
      </div>
    </CollapsibleContext>
  );
}

type TriggerProps = {
  asChild?: boolean;
  children: React.ReactNode;
};

export function Trigger({ asChild, children }: TriggerProps) {
  const { open, onToggle, contentId, triggerId } = useCollapsibleContext();

  if (asChild && isValidElement(children)) {
    const child = children as React.ReactElement<
      React.HTMLAttributes<HTMLElement>
    >;

    const childOnClick = child.props.onClick;

    return cloneElement(child, {
      id: triggerId,
      "aria-expanded": open,
      "aria-controls": contentId,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        onToggle();
        childOnClick?.(e);
      },
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      id={triggerId}
      aria-controls={contentId}
      aria-expanded={open}
      onClick={onToggle}
      type="button"
    >
      {children}
    </button>
  );
}

type ContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function Content({ children, className }: ContentProps) {
  const { open, contentId } = useCollapsibleContext();

  if (!open) return null;

  return (
    <div className={className} id={contentId}>
      {children}
    </div>
  );
}

export type CollapsibleProps = {
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  header?: React.ReactNode;
  omitBorder?: boolean;
  omitPadding?: boolean;
  onOpenChange?: (x: boolean) => void;
  open?: boolean;
  sub?: React.ReactNode;
  title: React.ReactNode;
  triggerClassName?: string;
  triggerReversed?: boolean;
  variant?: "active";
};

export function Collapsible(props: CollapsibleProps) {
  const {
    actions,
    className,
    children,
    open,
    defaultOpen,
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
      defaultOpen={defaultOpen}
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
            <CollapsibleToggleButton controlledOpen={open} />
          </div>
        </div>
      </Trigger>
      {children}
    </Root>
  );
}

function CollapsibleToggleButton({
  controlledOpen,
}: {
  controlledOpen?: boolean;
}) {
  const { open: contextOpen } = useCollapsibleContext();
  const { t } = useTranslation();

  const isOpen = contextOpen;

  const tooltip =
    controlledOpen == null
      ? t("ui.collapsible.toggle")
      : isOpen
        ? t("ui.collapsible.collapse")
        : t("ui.collapsible.expand");

  return (
    <Button iconOnly variant="bare" tooltip={tooltip}>
      {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
    </Button>
  );
}

type CollapsibleContentProps = {
  className?: string;
  children: React.ReactNode;
};

export function CollapsibleContent({
  className,
  children,
}: CollapsibleContentProps) {
  return (
    <Content>
      <div className={cx(css["content"], className)}>{children}</div>
    </Content>
  );
}
