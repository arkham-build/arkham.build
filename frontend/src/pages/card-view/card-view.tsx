import { DownloadIcon, GlobeIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "wouter";
import {
  CardArkhamDBLink,
  CardReviewsLink,
} from "@/components/card-modal/card-arkhamdb-links";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { CardFavorite } from "@/components/card-tags/card-favorite";
import { CardTagManager, CardTags } from "@/components/card-tags/card-tags";
import { Footer } from "@/components/footer";
import { Masthead } from "@/components/masthead";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { CardViewCards } from "@/pages/card-view/card-view-cards";
import { useStore } from "@/store";
import { filterPlayerCards } from "@/store/lib/filtering";
import type { CardWithRelations } from "@/store/lib/types";
import { selectCardWithRelations } from "@/store/selectors/card-view";
import {
  deckCreateLink,
  displayAttribute,
  isStaticInvestigator,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { download } from "@/utils/download";
import { ErrorStatus } from "../errors/404";
import css from "./card-view.module.css";
import { Printings } from "./printings";
import { UsableBy } from "./usable-by";

function CardView() {
  const { code } = useParams();

  const { t } = useTranslation();
  const cardWithRelations = useStore((state) =>
    selectCardWithRelations(state, code, true, undefined),
  );
  const devModeEnabled = useStore((state) => state.settings.devModeEnabled);

  const onExport = useCallback(() => {
    if (!cardWithRelations) return;

    const cards = [
      cardWithRelations.card,
      ...(cardWithRelations.back?.card ? [cardWithRelations.back.card] : []),
    ];

    download(
      JSON.stringify(cards, null, 2),
      `${cardWithRelations.card.code}.json`,
      "application/json",
    );
  }, [cardWithRelations]);

  if (!cardWithRelations) {
    return <ErrorStatus statusCode={404} />;
  }

  const isInvestigator = cardWithRelations.card.type_code === "investigator";
  const isBuildableInvestigator =
    isInvestigator && !isStaticInvestigator(cardWithRelations.card);

  const deckbuildable =
    filterPlayerCards(cardWithRelations.card) && !isInvestigator;

  const parallel = (cardWithRelations as CardWithRelations).relations?.parallel
    ?.card;

  return (
    <CardModalProvider>
      <PageTitle>{displayAttribute(cardWithRelations.card, "name")}</PageTitle>
      <div className={cx(css["layout"], "fade-in")}>
        <Masthead className={css["header"]} />
        <main className={css["main"]}>
          <CardViewCards
            cardWithRelations={cardWithRelations}
            key={cardWithRelations.card.code}
          />
        </main>
        <nav className={css["sidebar"]}>
          <div className={css["sidebar-inner"]}>
            <SidebarSection title={t("card_view.section_printings")}>
              <Printings code={cardWithRelations.card.code} />
            </SidebarSection>
            <SidebarSection
              title={
                <>
                  {t("card_tags.title")}
                  <CardTagManager cardCode={cardWithRelations.card.code} />
                </>
              }
            >
              <CardTags cardCode={cardWithRelations.card.code} />
            </SidebarSection>
            <SidebarSection title={t("card_view.section_actions")}>
              {isBuildableInvestigator && (
                <Link asChild href={deckCreateLink(cardWithRelations.card)}>
                  <Button as="a" data-testid="card-modal-create-deck" full>
                    <i className="icon-deck" /> {t("deck.actions.create")}
                  </Button>
                </Link>
              )}
              <CardFavorite card={cardWithRelations.card} />
              <CardArkhamDBLink card={cardWithRelations.card} full>
                <GlobeIcon /> {t("card_view.actions.open_on_arkhamdb")}
              </CardArkhamDBLink>
              <CardReviewsLink card={cardWithRelations.card} full />
              {devModeEnabled && (
                <Button data-testid="card-view-export" onClick={onExport} full>
                  <DownloadIcon />
                  {t("lists.nav.export")}
                </Button>
              )}
            </SidebarSection>

            {(deckbuildable || isInvestigator) && (
              <SidebarSection title={t("card_view.section_deckbuilding")}>
                {isBuildableInvestigator && (
                  <>
                    <Link
                      asChild
                      href={`/card/${cardWithRelations.card.code}/usable_cards`}
                    >
                      <Button full data-testid="usable-cards" as="a">
                        <i className="icon-cards" />
                        {t("card_view.actions.usable_by", {
                          prefix: "",
                          name: displayAttribute(
                            cardWithRelations.card,
                            "name",
                          ),
                        })}
                      </Button>
                    </Link>
                    {parallel && (
                      <Link
                        asChild
                        href={`/card/${parallel.code}/usable_cards`}
                      >
                        <Button full data-testid="usable-cards-parallel" as="a">
                          <i className="icon-cards" />
                          {t("card_view.actions.usable_by", {
                            prefix: `${t("common.parallel")} `,
                            name: displayAttribute(
                              cardWithRelations.card,
                              "name",
                            ),
                          })}
                        </Button>
                      </Link>
                    )}
                  </>
                )}
                {deckbuildable && <UsableBy card={cardWithRelations.card} />}
              </SidebarSection>
            )}
          </div>
        </nav>
        <Footer />
      </div>
    </CardModalProvider>
  );
}

function SidebarSection(props: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={css["sidebar-section"]}>
      <header className={css["sidebar-section-header"]}>
        <h2 className={css["sidebar-section-title"]}>{props.title}</h2>
      </header>
      <div className={css["sidebar-section-content"]}>{props.children}</div>
    </section>
  );
}

export default CardView;
