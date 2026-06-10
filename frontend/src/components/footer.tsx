import { Trans, useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import css from "./footer.module.css";

type Props = {
  className?: string;
};

export function Footer(props: Props) {
  const { t } = useTranslation();

  return (
    <div className={cx(css["footer"], props.className)}>
      <div className={css["footer-inner"]}>
        <p>
          <Trans
            i18nKey="footer.disclaimer"
            t={t}
            components={{
              arkham: (
                <a
                  href="https://www.fantasyflightgames.com/en/products/arkham-horror-the-card-game/"
                  rel="noreferrer"
                  target="_blank"
                  tabIndex={-1}
                >
                  {t("footer.arkham_title")}
                </a>
              ),
              ffg: (
                <a
                  href="https://www.fantasyflightgames.com"
                  rel="noreferrer"
                  target="_blank"
                  tabIndex={-1}
                >
                  {t("footer.ffg")}
                </a>
              ),
            }}
          />
        </p>
      </div>
    </div>
  );
}
