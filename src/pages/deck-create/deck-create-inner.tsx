import { Footer } from "@/components/footer";
import { Masthead } from "@/components/masthead";
import { cx } from "@/utils/cx";
import css from "./deck-create.module.css";
import { DeckCreateCardSets } from "./deck-create-card-sets";
import { DeckCreateEditor } from "./deck-create-editor";
import { DeckCreateInvestigator } from "./deck-create-investigator";

export function DeckCreateInner() {
  return (
    <div className={cx(css["layout"], "fade-in")}>
      <Masthead className={css["layout-header"]} />
      <div className={css["layout-sidebar"]}>
        <DeckCreateEditor />
      </div>
      <div className={css["layout-content"]}>
        <DeckCreateInvestigator />
      </div>
      <div className={css["layout-selections"]}>
        <DeckCreateCardSets />
      </div>
      <footer className={css["layout-footer"]}>
        <Footer />
      </footer>
    </div>
  );
}
