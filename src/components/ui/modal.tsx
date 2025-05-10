import { cx } from "@/utils/cx";
import { XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "./button";
import { useDialogContext } from "./dialog.hooks";
import css from "./modal.module.css";
import { Scroller } from "./scroller";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  centerContent?: boolean;
  children: React.ReactNode;
  className?: string;
  actionsClassName?: string;
  innerClassName?: string;
  actions?: React.ReactNode;
  onClose?: () => void;
  open?: boolean;
  size?: string;
}

export function Modal(props: Props) {
  const {
    actions,
    actionsClassName,
    centerContent,
    children,
    className,
    innerClassName,
    onClose,
    open,
    size = "100%",
    ...rest
  } = props;

  const modalRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const hasReset = useRef(false);
  const dialogContext = useDialogContext();

  const closeModal = useCallback(() => {
    if (onClose) {
      onClose();
    } else if (dialogContext?.setOpen) {
      dialogContext.setOpen(false);
    }
  }, [onClose, dialogContext?.setOpen]);

  useEffect(() => {
    if (open && !hasReset.current) {
      hasReset.current = true;
      modalRef.current?.scrollTo(0, 0);
    }
  }, [open]);

  const onCloseModalOutside = useCallback(
    (evt: React.MouseEvent) => {
      if (
        evt.target instanceof HTMLElement &&
        modalRef.current?.contains(evt.target) &&
        !innerRef.current?.contains(evt.target)
      ) {
        closeModal();
      }
    },
    [closeModal],
  );

  const onCloseActions = useCallback(
    (evt: React.MouseEvent) => {
      if (evt.target === actionRef.current) closeModal();
    },
    [closeModal],
  );

  const cssVariables = useMemo(
    () => ({
      "--modal-width": size,
    }),
    [size],
  );

  return (
    <div
      {...rest}
      className={cx(css["modal"], centerContent && css["center"], className)}
      onClick={onCloseModalOutside}
      ref={modalRef}
      style={cssVariables as React.CSSProperties}
    >
      <Scroller type="always">
        <div className={cx(css["inner"], innerClassName)} ref={innerRef}>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: An escape handler is bound higher up. */}
          <div
            className={cx(
              css["actions"],
              actions && css["has-custom"],
              actionsClassName,
            )}
            onClick={onCloseActions}
            ref={actionRef}
          >
            <nav className={css["actions-row"]}>{actions}</nav>
            <Button className={css["close"]} iconOnly onClick={closeModal}>
              <XIcon />
            </Button>
          </div>
          {children}
        </div>
      </Scroller>
    </div>
  );
}

type ModalContentProps = {
  children: React.ReactNode;
  mainClassName?: string;
  footer?: React.ReactNode;
  title?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "title">;

export function ModalContent(props: ModalContentProps) {
  const { children, className, footer, mainClassName, title, ...rest } = props;

  return (
    <section className={cx(css["content"], className)} {...rest}>
      {title && (
        <header className={css["content-header"]}>
          <h2 className={css["content-title"]}>{title}</h2>
        </header>
      )}
      <div className={cx(css["content-main"], mainClassName)}>{children}</div>
      {footer && <footer className={css["content-footer"]}>{footer}</footer>}
    </section>
  );
}
