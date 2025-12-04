/** biome-ignore-all lint/a11y/useKeyWithClickEvents: escape handler is defined higher up. */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: backdrop needs to be clickable. */
import { XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { MQ_MOBILE } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { useMedia } from "@/utils/use-media";
import { Button } from "./button";
import { useDialogContextChecked } from "./dialog.hooks";
import css from "./modal.module.css";
import { Scroller } from "./scroller";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  size?: string;
}

export function Modal(props: Props) {
  const { children, className, ...rest } = props;

  const closeModal = useCloseModal();

  const modalRef = useRef<HTMLDivElement>(null);
  const hasAddedState = useRef(false);

  const isMobile = useMedia(MQ_MOBILE);

  useEffect(() => {
    if (!isMobile) return;

    if (!hasAddedState.current) {
      window.history.replaceState(
        { isModal: true },
        document.title,
        window.location.href,
      );

      window.history.pushState(
        { isModal: true },
        document.title,
        window.location.href,
      );

      hasAddedState.current = true;
    }

    const onPopState = (evt: PopStateEvent) => {
      if (evt.state?.isModal) {
        closeModal();
      }
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [closeModal, isMobile]);

  return (
    <div
      {...rest}
      className={cx(css["modal"], className)}
      onMouseDown={
        isMobile
          ? () => {
              window.history.back();
            }
          : closeModal
      }
      ref={modalRef}
    >
      {children}
    </div>
  );
}

type ModalActionProps = {
  children?: React.ReactNode;
  className?: string;
};

export function ModalActions(props: ModalActionProps) {
  const { children, className } = props;

  const closeModal = useCloseModal();

  const actionRef = useRef<HTMLDivElement>(null);

  const onCloseActions = useCallback(
    (evt: React.MouseEvent) => {
      if (evt.target === actionRef.current) closeModal();
    },
    [closeModal],
  );

  return (
    <div
      className={cx(css["actions"], children && css["has-custom"], className)}
      onClick={onCloseActions}
      ref={actionRef}
    >
      <nav className={css["actions-row"]}>{children}</nav>
      <Button
        className={css["close"]}
        iconOnly
        onClick={closeModal}
        data-testid="modal-close"
      >
        <XIcon />
      </Button>
    </div>
  );
}

type ModalInnerProps = {
  className?: string;
  children: React.ReactNode;
  size?: string;
};

export function ModalInner(props: ModalInnerProps) {
  const { className, children, size } = props;

  const stopPropagation = useCallback((evt: React.MouseEvent) => {
    evt.stopPropagation();
  }, []);

  const cssVariables = useMemo(
    () => ({
      "--modal-width": size,
    }),
    [size],
  );

  return (
    <Scroller type="always">
      <div
        className={cx(css["inner"], className)}
        onMouseDown={stopPropagation}
        style={cssVariables as React.CSSProperties}
      >
        {children}
      </div>
    </Scroller>
  );
}

type ModalBackdropProps = {
  className?: string;
};

export function ModalBackdrop(props: ModalBackdropProps) {
  const { className } = props;
  return <div className={cx(css["backdrop"], className)} />;
}

type DefaultModalContentProps = {
  children: React.ReactNode;
  mainClassName?: string;
  footer?: React.ReactNode;
  title?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "title">;

export function DefaultModalContent(props: DefaultModalContentProps) {
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

function useCloseModal() {
  const modalContext = useDialogContextChecked();

  const onCloseModal = useCallback(() => {
    modalContext.setOpen(false);
  }, [modalContext]);

  return onCloseModal;
}
