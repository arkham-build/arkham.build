import DOMPurify from "dompurify";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Details } from "@/components/ui/details";
import { useFaqQuery } from "@/queries/legacy";
import type { ResolvedCard } from "@/store/lib/types";
import { redirectArkhamDBLinks } from "@/utils/arkhamdb";
import { isEmpty } from "@/utils/is-empty";

type Props = {
  card: ResolvedCard["card"];
};

export function Faq(props: Props) {
  const [open, setOpen] = useState(false);
  const { card } = props;

  const { t } = useTranslation();

  const response = useFaqQuery(card.code, open);

  return (
    <Details
      iconClosed={<span>?</span>}
      onOpenChange={setOpen}
      title={t("card_view.actions.faq")}
      scrollHeight="20rem"
    >
      {/* biome-ignore lint/a11y: not relevant. */}
      <div onClick={redirectArkhamDBLinks}>
        {response.isPending && t("card_view.faq.loading")}

        {!!response.error && t("card_view.faq.error")}

        {response.data?.length === 0 && t("card_view.faq.empty")}

        {!isEmpty(response.data) &&
          response.data.map((faq, i) => (
            <p
              // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized.
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(faq.html) }}
              // biome-ignore lint/suspicious/noArrayIndexKey: order is stable.
              key={i}
            />
          ))}
      </div>
    </Details>
  );
}
