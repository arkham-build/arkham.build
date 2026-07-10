import { useTranslation } from "react-i18next";
import { parseCardTextHtml } from "@/utils/card-utils";
import css from "./card.module.css";

type Props = {
  flavor?: string;
  size: "full" | "compact" | "tooltip";
  text?: string;
  typeCode: string;
  vengeance?: number | null;
  victory?: number | null;
};

export function CardText(props: Props) {
  const { flavor, size, text, typeCode, vengeance, victory } = props;
  const { t } = useTranslation();

  const swapFlavor = ["agenda", "act", "story"].includes(typeCode);

  const textNode = !!text && (
    <div className={css["text"]} data-testid="card-text">
      {text && (
        <p
          // oxlint-disable-next-line react/no-danger -- HTML is from trusted source.
          dangerouslySetInnerHTML={{
            __html: parseCardTextHtml(text, { bullets: true }),
          }}
        />
      )}
      {victory != null && (
        <p>
          <b>
            {t("common.victory")} {victory}.
          </b>
        </p>
      )}
      {vengeance != null && (
        <p>
          <b>
            {t("common.vengeance")} {vengeance}.
          </b>
        </p>
      )}
    </div>
  );

  const flavorNode = !!flavor && size !== "tooltip" && (
    <div className={css["flavor"]}>
      <p
        // oxlint-disable-next-line react/no-danger -- HTML is from trusted source.
        dangerouslySetInnerHTML={{
          __html: parseCardTextHtml(flavor, { bullets: false }),
        }}
      />
    </div>
  );

  if (!flavorNode && !textNode) return null;

  return swapFlavor ? (
    <>
      {flavorNode}
      {textNode}
    </>
  ) : (
    <>
      {textNode}
      {flavorNode}
    </>
  );
}
