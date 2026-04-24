import { useLayoutEffect, useMemo } from "react";
import { Card } from "@/components/card/card";
import { Masthead } from "@/components/masthead";
import { PageTitle } from "@/components/ui/page-title";
import { useStore } from "@/store";
import type { ResolvedCard } from "@/store/lib/types";
import { selectResolvedCardById } from "@/store/selectors/lists";
import {
  applyColorTheme,
  getColorThemePreference,
} from "@/utils/use-color-theme";
import { useMedia } from "@/utils/use-media";
import css from "./investigator-2026-reveal.module.css";

function Investigator2026Reveal() {
  const arcaneInitiate = useStore(
    (state) => selectResolvedCardById(state, "60455") as ResolvedCard,
  );

  const offeringBowl = useStore(
    (state) => selectResolvedCardById(state, "60456") as ResolvedCard,
  );

  const bloodstone = useStore(
    (state) => selectResolvedCardById(state, "60457") as ResolvedCard,
  );

  const cosmicGuidance = useStore(
    (state) => selectResolvedCardById(state, "60468") as ResolvedCard,
  );

  const cards = useMemo(
    () => [
      {
        card: arcaneInitiate,
        fileName: "reveal_arcane_initiate",
      },
      {
        card: offeringBowl,
        fileName: "reveal_offering_bowl",
      },
      {
        card: bloodstone,
        fileName: "reveal_bloodstone",
      },
      {
        card: cosmicGuidance,
        fileName: "reveal_cosmic_guidance",
      },
    ],
    [arcaneInitiate, offeringBowl, bloodstone, cosmicGuidance],
  );

  const prefersDarkMode = useMedia("(prefers-color-scheme: dark)");

  useLayoutEffect(() => {
    document.documentElement.style.background = "#000";
    applyColorTheme("dark", false);
    return () => {
      document.documentElement.style.background = "";
      applyColorTheme(getColorThemePreference(), prefersDarkMode);
    };
  }, [prefersDarkMode]);

  return (
    <main className={css["layout"]}>
      <PageTitle>Investigator Starter Decks 2026 Reveal</PageTitle>

      <header className={css["header"]}>
        <div className={css["header-nav"]}>
          <Masthead hideLocaleSwitch hideSyncStatus invert />
        </div>
        <h1>
          <i className="icon-mystic fg-mystic" />
          Investigator Starter Decks 2026 Reveal
        </h1>
        <p>
          Presenting four mint cards from <em>Arkham Horror: The Card Game</em>
          's upcoming{" "}
          <a
            className="fg-mystic"
            href="https://store.asmodee.com/products/arkham-horror-the-card-game-marie-lambeau-investigator-deck?_pos=1&_sid=1c973d5d3&_ss=r"
            target="_blank"
            rel="noreferrer"
          >
            Marie Lambeau Investigator Deck
          </a>
          . Card renders by{" "}
          <a
            className="fg-mystic"
            href="https://www.instagram.com/alexspoettel"
            rel="noreferrer"
            target="_blank"
          >
            Alex
          </a>
          .
        </p>
      </header>
      <div className={css["cards"]}>
        {cards.map(({ card, fileName }, i) => (
          <figure className={css["card"]} key={card.card.code}>
            <div className={css["card-media"]}>
              <img
                src={`/assets/blog/${fileName}.avif`}
                loading={i === 0 ? "eager" : "lazy"}
                alt={card.card.real_name}
              />
            </div>
            <figcaption>
              <Card resolvedCard={card} size="compact" omitImage />
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}

export default Investigator2026Reveal;
