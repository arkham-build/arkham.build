import { cx } from "@/utils/cx";
import { ChevronUpIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "./button";
import css from "./details.module.css";
import { Scroller } from "./scroller";

type Props = {
  children: React.ReactNode;
  iconClosed: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  scrollHeight?: string;
  title: React.ReactNode;
} & React.DetailsHTMLAttributes<HTMLDetailsElement>;

export function Details(props: Props) {
  const { children, iconClosed, onOpenChange, scrollHeight, title, ...rest } =
    props;

  const [open, setOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const cssVariables = useMemo(
    () => ({
      "--scroll-height": scrollHeight,
    }),
    [scrollHeight],
  );

  return (
    <details {...rest} className={css["details"]}>
      <Button
        data-testid="details-toggle"
        as="summary"
        onClick={() => setOpen((p) => !p)}
        size="full"
      >
        {open ? <ChevronUpIcon /> : iconClosed} {title}
      </Button>

      {scrollHeight ? (
        <Scroller
          data-testid="details-content"
          className={cx(css["details-content"], css["scrollable"])}
          style={cssVariables as React.CSSProperties}
        >
          {children}
        </Scroller>
      ) : (
        <div className={css["details-content"]} data-testid="details-content">
          {children}
        </div>
      )}
    </details>
  );
}
