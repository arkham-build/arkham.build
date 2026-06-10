/** biome-ignore-all lint/a11y/useKeyWithClickEvents: not relevant. */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: catches onclick bubbles up from content. */
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const openCardModal = useStore((state) => state.openCardModal);

  const { cardLinkTooltip, referenceProps } = useCardLinkTooltip();

  const onLinkClick = useCallback(
    (evt: React.MouseEvent) => {
      if (evt.target instanceof HTMLElement) {
        const loadEmbedButton = evt.target.closest("[data-load-embed]");

        if (loadEmbedButton) {
          evt.preventDefault();
          loadExternalEmbed(loadEmbedButton);
          return;
        }

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
          __html: parseMarkdown(content, {
            noImageReferrer: true,
            externalEmbeds: {
              loadLabel: t("external_embed.load"),
              notice: t("external_embed.notice"),
              title: t("external_embed.title"),
            },
          }),
        }}
        onClick={onLinkClick}
        {...referenceProps}
      />

      {cardLinkTooltip}
    </>
  );
}

function loadExternalEmbed(trigger: Element) {
  const placeholder = trigger.closest("[data-embed-src]");

  if (!(placeholder instanceof HTMLElement)) {
    return;
  }

  const { embedAllow, embedAllowfullscreen, embedSrc, embedTitle } =
    placeholder.dataset;

  if (!embedSrc) {
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.src = embedSrc;
  iframe.title = embedTitle ?? "";
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";

  if (embedAllow) {
    iframe.allow = embedAllow;
  }

  if (embedAllowfullscreen === "true") {
    iframe.allowFullscreen = true;
  }

  placeholder.replaceChildren(iframe);
  placeholder.removeAttribute("data-embed-src");
}

export default DeckDescription;
