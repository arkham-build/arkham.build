import { CardModalProvider } from "@/components/card-modal/card-modal-context";
import { Footer } from "@/components/footer";
import { Masthead } from "@/components/masthead";
import { Button } from "@/components/ui/button";
import { CardViewCards } from "@/pages/card-view/card-view-cards";
import { useStore } from "@/store";
import type { CardWithRelations } from "@/store/lib/types";
import { selectCardWithRelations } from "@/store/selectors/card-view";
import { isStaticInvestigator } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { useDocumentTitle } from "@/utils/use-document-title";
import { GlobeIcon, MessagesSquareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "wouter";
import { Error404 } from "../errors/404";
import css from "./card-view.module.css";
import { Faq } from "./faq";
import { UsableBy } from "./usable-by";

function CardView() {
  const { code } = useParams();

  const { t } = useTranslation();
  const cardWithRelations = useStore((state) =>
    selectCardWithRelations(state, code, true, undefined),
  );

  useDocumentTitle(
    cardWithRelations ? `${cardWithRelations.card.real_name}` : undefined,
  );

  if (!cardWithRelations) {
    return <Error404 />;
  }

  const isInvestigator = cardWithRelations.card.type_code === "investigator";
  const isBuildableInvestigator =
    isInvestigator && !isStaticInvestigator(cardWithRelations.card);

  const deckbuildable =
    !cardWithRelations.card.encounter_code && !isInvestigator;

  const parallel = (cardWithRelations as CardWithRelations).relations?.parallel
    ?.card;

  return (
    <CardModalProvider>
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
            <SidebarSection title={t("card_view.section_actions")}>
              <Button
                as="a"
                href={`https://arkhamdb.com/card/${cardWithRelations.card.code}`}
                rel="noreferrer"
                target="_blank"
                size="full"
              >
                <GlobeIcon /> {t("card_view.actions.open_on_arkhamdb")}
              </Button>
              <Button
                as="a"
                href={`https://arkhamdb.com/card/${cardWithRelations.card.code}#reviews-header`}
                rel="noreferrer"
                target="_blank"
                size="full"
              >
                <MessagesSquareIcon /> {t("card_view.actions.reviews")}
              </Button>
              {isBuildableInvestigator && (
                <Link
                  asChild
                  href={`/deck/create/${cardWithRelations.card.code}`}
                >
                  <Button
                    as="a"
                    data-testid="card-modal-create-deck"
                    size="full"
                  >
                    <i className="icon-deck" /> {t("deck.actions.create")}
                  </Button>
                </Link>
              )}
            </SidebarSection>
            <SidebarSection title={t("card_view.section_faq")}>
              <Faq card={cardWithRelations.card} />
            </SidebarSection>

            {(deckbuildable || isInvestigator) && (
              <SidebarSection title={t("card_view.section_deckbuilding")}>
                {isBuildableInvestigator && (
                  <>
                    <Link
                      asChild
                      href={`/card/${cardWithRelations.card.code}/usable_cards`}
                    >
                      <Button size="full" data-testid="usable-cards" as="a">
                        <i className="icon-cards" />
                        {t("card_view.actions.usable_by", {
                          prefix: "",
                          name: cardWithRelations.card.real_name,
                        })}
                      </Button>
                    </Link>
                    {parallel && (
                      <Link
                        asChild
                        href={`/card/${parallel.code}/usable_cards`}
                      >
                        <Button
                          size="full"
                          data-testid="usable-cards-parallel"
                          as="a"
                        >
                          <i className="icon-cards" />
                          {t("card_view.actions.usable_by", {
                            prefix: `${t("common.parallel")} `,
                            name: cardWithRelations.card.real_name,
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
  title: string;
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
