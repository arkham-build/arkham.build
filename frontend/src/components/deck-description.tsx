/** biome-ignore-all lint/a11y/useKeyWithClickEvents: not relevant. */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: catches onclick bubbles up from content. */
import {
  autoPlacement,
  autoUpdate,
  FloatingPortal,
  offset,
  shift,
  useFloating,
  useTransitionStyles,
} from "@floating-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/store";
import { redirectArkhamDBLinks } from "@/utils/arkhamdb";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import { cx } from "@/utils/cx";
import { parseMarkdown } from "@/utils/markdown";
import { CardTooltip } from "./card-tooltip/card-tooltip";
import css from "./deck-description.module.css";

type Props = {
  centered?: boolean;
  className?: string;
  content: string;
};

function DeckDescription(props: Props) {
  const { centered, className, content } = props;

  const openCardModal = useStore((state) => state.openCardModal);

  const [cardTooltip, setCardTooltip] = useState<string>("");

  const restTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(
    () => () => {
      if (restTimeoutRef.current) clearTimeout(restTimeoutRef.current);
    },
    [],
  );

  const { context, refs, floatingStyles } = useFloating({
    open: !!cardTooltip,
    onOpenChange: () => setCardTooltip(""),
    middleware: [shift(), autoPlacement(), offset(2)],
    whileElementsMounted: autoUpdate,
    strategy: "fixed",
    placement: "bottom-start",
  });

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);

  const onPointerMove = useCallback(
    (evt: React.PointerEvent) => {
      const anchor = (evt.target as HTMLElement)?.closest("a");

      if (anchor instanceof HTMLAnchorElement) {
        const code = /\/card\/(.*)$/.exec(anchor.href)?.[1];

        if (code) {
          clearTimeout(restTimeoutRef.current);

          const rect = anchor.getBoundingClientRect();
          refs.setPositionReference({
            getBoundingClientRect: () => rect,
          });

          restTimeoutRef.current = setTimeout(() => {
            setCardTooltip(code);
          }, 25);
          return;
        }
      }

      clearTimeout(restTimeoutRef.current);
      setCardTooltip("");
    },
    [refs],
  );

  const onPointerLeave = useCallback(() => {
    clearTimeout(restTimeoutRef.current);
    setCardTooltip("");
  }, []);

  const onLinkClick = useCallback(
    (evt: React.MouseEvent) => {
      if (evt.target instanceof HTMLElement) {
        const anchor = evt.target.closest("a") as HTMLAnchorElement | null;
        const href = anchor?.getAttribute("href");

        if (href?.includes("/card/") && !href.includes("#")) {
          evt.preventDefault();
          const code = anchor?.href.split("/card/").at(-1);

          if (code) {
            openCardModal(code);
          } else {
            redirectArkhamDBLinks(evt);
          }
        } else {
          redirectArkhamDBLinks(evt);
        }
      }
    },
    [openCardModal],
  );

  return (
    <>
      <div
        className={cx(
          css["description"],
          "longform",
          centered && css["centered"],
          className,
        )}
        data-testid="description-content"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: we sanitize html content.
        dangerouslySetInnerHTML={{
          __html: parseMarkdown(content),
        }}
        onClick={onLinkClick}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      />

      {isMounted && cardTooltip && (
        <FloatingPortal id={FLOATING_PORTAL_ID}>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, ...transitionStyles }}
          >
            <CardTooltip code={cardTooltip} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default DeckDescription;
