/** biome-ignore-all lint/a11y/useKeyWithClickEvents: not relevant. */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: catches onclick bubbles up from content. */
import { useCallback } from "react";
import { useCardLinkTooltip } from "@/components/card-tooltip/use-card-link-tooltip";
import { useStore } from "@/store";
import { redirectArkhamDBLinks } from "@/utils/arkhamdb";
import { cx } from "@/utils/cx";
import { parseMarkdown } from "@/utils/markdown";
import css from "./deck-description.module.css";

type Props = {
  centered?: boolean;
  className?: string;
  content: string;
};

function DeckDescription(props: Props) {
  const { centered, className, content } = props;

  const openCardModal = useStore((state) => state.openCardModal);

  const { cardLinkTooltip, referenceProps } = useCardLinkTooltip();

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
        {...referenceProps}
      />

      {cardLinkTooltip}
    </>
  );
}

export default DeckDescription;
