import { LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCardLinkTooltip } from "@/components/card-tooltip/use-card-link-tooltip";
import { PlaneContainer } from "@/components/ui/plane-container";
import { Tag } from "@/components/ui/tag";
import { useCardFaqQuery } from "@/queries/grimoire";
import { parseCardTextHtml } from "@/utils/card-utils";
import { parseMarkdown } from "@/utils/markdown";
import css from "./card-faq.module.css";

type Props = {
  code: string;
};

export function CardFaq(props: Props) {
  const { code } = props;
  const { t } = useTranslation();
  const faq = useCardFaqQuery(code);
  const { cardLinkTooltip, referenceProps } = useCardLinkTooltip();

  return (
    <PlaneContainer as="section" title={t("card_view.faq.title")}>
      {faq.isPending && (
        <output className={css["status"]}>
          <LoaderCircleIcon className="spin" />
        </output>
      )}

      {faq.error && (
        <output className={css["status"]}>{t("card_view.faq.error")}</output>
      )}

      {faq.data?.length === 0 && (
        <output className={css["status"]}>{t("card_view.faq.empty")}</output>
      )}

      {!!faq.data?.length && (
        <ul className={css["list"]} {...referenceProps}>
          {faq.data.map((item) => (
            <li key={item.id}>
              <div
                className={css["question"]}
                // oxlint-disable-next-line react/no-danger -- HTML is from trusted source.
                dangerouslySetInnerHTML={{
                  __html: parseCardTextHtml(parseMarkdown(item.question)),
                }}
              />
              <div
                // oxlint-disable-next-line react/no-danger -- HTML is from trusted source.
                dangerouslySetInnerHTML={{
                  __html: parseCardTextHtml(parseMarkdown(item.ruling)),
                }}
              />
              <p>
                <Tag size="sm">{item.citation}</Tag>
              </p>
            </li>
          ))}
        </ul>
      )}

      {cardLinkTooltip}
    </PlaneContainer>
  );
}
