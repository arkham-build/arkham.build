import { ChevronLeftIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Socials } from "@/components/socials";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/layouts/app-layout";
import { cx } from "@/utils/cx";
import { useGoBack } from "@/utils/use-go-back";
import css from "./about.module.css";

function About() {
  const goBack = useGoBack();
  const { t } = useTranslation();

  const date = new Date().getUTCFullYear();

  return (
    <AppLayout title={t("about.title")}>
      <div className={cx("longform", css["about"])}>
        <Button onClick={goBack} variant="bare">
          <ChevronLeftIcon /> {t("common.back")}
        </Button>
        <Socials />
        <h1>{t("about.title")}</h1>
        <Trans
          i18nKey="about.description"
          t={t}
          values={{ date }}
          components={{
            ffg: (
              // biome-ignore lint/a11y/useAnchorContent: not relevant here.
              <a
                href="https://www.fantasyflightgames.com/en/products/arkham-horror-the-card-game/"
                rel="noreferrer"
                target="_blank"
              />
            ),
            felix_url: (
              // biome-ignore lint/a11y/useAnchorContent: not relevant here.
              <a href="https://spoettel.dev" rel="noreferrer" target="_blank" />
            ),
            contrib_url: (
              // biome-ignore lint/a11y/useAnchorContent: not relevant here.
              <a
                href="https://github.com/fspoettel/arkham.build/graphs/contributors"
                rel="noreferrer"
                target="_blank"
              />
            ),
            github_url: (
              // biome-ignore lint/a11y/useAnchorContent: not relevant here.
              <a
                href="https://github.com/fspoettel/arkham.build"
                rel="noreferrer"
                target="_blank"
              />
            ),
          }}
        />
        <h2>🌟 {t("about.hall_of_fame.title")} 🌟</h2>
        <ul>
          <li>
            <strong>@zzorba:</strong> {t("about.hall_of_fame.zzorba")} 🙇‍♂️
          </li>
          <li>
            <strong>@Chr1Z</strong>, <strong>@Dangaroo</strong>,{" "}
            <strong>@5argon</strong>: {t("about.hall_of_fame.testing")}
          </li>
          <li>
            <strong>@TartanLlama</strong>, <strong>@MickeyTheQ</strong>,{" "}
            <strong>@blu</strong>, <strong>@5argon</strong>,{" "}
            <strong>@Marymatician</strong>: {t("about.hall_of_fame.code")}
          </li>
          <li>
            <strong>@kamalisk / ArkhamDB: </strong>{" "}
            {t("about.hall_of_fame.arkham_db")}
          </li>
          <li>
            <strong>@morvael</strong>:{" "}
            {t("about.hall_of_fame.customization_api")}
          </li>
          <li>
            <strong>@HatfulBob</strong>, <strong>@coldtoes</strong>:{" "}
            {t("about.hall_of_fame.card_design")}
          </li>
          <li>
            <strong>@Adran06</strong>, <strong>@coldtoes</strong>:{" "}
            {t("about.hall_of_fame.qa")}
          </li>
          <li>
            <strong>@dlloyd</strong>:{" "}
            {t("about.hall_of_fame.metadata")}
          </li>
        </ul>
        <p>{t("about.hall_of_fame.translation.title")}:</p>
        <ul>
          <li>
            {t("about.hall_of_fame.translation.ko")}:{" "}
            <strong>푸른이(@derornos)</strong>
          </li>
          <li>
            {t("about.hall_of_fame.translation.pl")}: <strong>@javnik36</strong>
          </li>
          <li>
            {t("about.hall_of_fame.translation.ru")}:{" "}
            <strong>@Evgeny727</strong>
          </li>
          <li>
            {t("about.hall_of_fame.translation.fr")}: <strong>@Zaratan</strong>
          </li>
          <li>
            {t("about.hall_of_fame.translation.es")}:{" "}
            <strong>@AdrianMeizoso</strong>
          </li>
          <li>
            {t("about.hall_of_fame.translation.zh")}:{" "}
            <strong>泡菜大王(@Ruikoto)</strong>
          </li>
        </ul>
        <h2>{t("about.image_credits.title")}</h2>
        <ul>
          <li>
            <strong>{t("about.image_credits.card_icons")}:</strong> Fantasy
            Flight Games
          </li>
          <li>
            <strong>{t("about.image_credits.logo")}:</strong> Dangaroo
          </li>
          <li>
            <strong>{t("about.image_credits.arkham_cards_icons")}:</strong>{" "}
            Eugene Sarnetsky
          </li>
          <li>
            <strong>{t("about.image_credits.404")}:</strong> FFG & 5argon
          </li>
          <li>
            <strong>{t("about.image_credits.other")}</strong>: lucide.dev
          </li>
        </ul>
      </div>
    </AppLayout>
  );
}

export default About;
