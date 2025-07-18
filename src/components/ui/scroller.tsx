/* eslint-disable react/display-name */
import type { ScrollAreaProps } from "@radix-ui/react-scroll-area";
import { Root, Scrollbar, Thumb, Viewport } from "@radix-ui/react-scroll-area";
import { forwardRef, useCallback } from "react";
import { cx } from "@/utils/cx";
import { useMedia } from "@/utils/use-media";
import css from "./scroller.module.css";

interface Props extends ScrollAreaProps {
  className?: string;
  children: React.ReactNode;
  viewportClassName?: string;
}

export const Scroller = forwardRef(
  (props: Props, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { children, className, type, viewportClassName, ...rest } = props;

    const touchDevice = useMedia("(hover: none)");

    const scrollerType = touchDevice && type === "hover" ? "scroll" : type;

    const stopPropagation = useCallback(
      (evt: React.MouseEvent<HTMLDivElement>) => {
        evt.stopPropagation();
      },
      [],
    );

    return (
      <Root
        {...rest}
        className={cx(
          css["scroller"],
          scrollerType === "always" && css["permanent-scrollbar"],
          className,
        )}
        type={scrollerType ?? "scroll"}
      >
        <Viewport
          className={cx(css["viewport"], viewportClassName)}
          ref={ref}
          tabIndex={-1}
        >
          {children}
        </Viewport>
        <Scrollbar
          className={css["scrollbar"]}
          onMouseDown={stopPropagation}
          orientation="vertical"
        >
          <Thumb className={css["scrollbar-thumb"]} />
        </Scrollbar>
      </Root>
    );
  },
);
