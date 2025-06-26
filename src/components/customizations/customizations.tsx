import { useTranslation } from "react-i18next";
import type { ResolvedCard } from "@/store/lib/types";
import {
  displayAttribute,
  getCardColor,
  parseCardTextHtml,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./customizations.module.css";

type Props = {
  card: ResolvedCard["card"];
};

export function Customizations(props: Props) {
  const { t } = useTranslation();
  const backgroundCls = getCardColor(props.card, "background");

  const html = parseCardTextHtml(
    displayAttribute(props.card, "customization_text"),
  );

  return (
    <article className={css["customizations"]}>
      <header className={cx(css["header"], backgroundCls)}>
        <h3>{t("common.customizations")}</h3>
      </header>
      <div className={css["text"]}>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is from trusted source. */}
        <p dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </article>
  );
}
