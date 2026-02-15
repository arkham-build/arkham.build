import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import DeckDescription from "@/components/deck-description";
import { Plane } from "@/components/ui/plane";
import { Scroller } from "@/components/ui/scroller";
import type { ResolvedDeck } from "@/store/lib/types";
import css from "./notes-preview.module.css";

type Props = {
  deck: ResolvedDeck;
};

export function NotesPreview(props: Props) {
  const { deck } = props;

  const { t } = useTranslation();

  const bannerUrl = useDeferredValue(deck.metaParsed.banner_url ?? "");
  const introMd = useDeferredValue(deck.metaParsed.intro_md ?? "");
  const descriptionMd = useDeferredValue(deck.description_md ?? "");

  return (
    <Plane className={css["preview"]} size="sm">
      <h2 className={css["preview-title"]}>
        {t("deck_edit.notes.toolbar.preview")}
      </h2>
      <Scroller>
        <div className={css["preview-inner"]}>
          {bannerUrl && (
            <div className={css["banner"]}>
              <img alt="Deck banner" src={bannerUrl} />
            </div>
          )}
          {introMd && <DeckDescription content={introMd} centered />}
          {descriptionMd && <DeckDescription content={descriptionMd} />}
        </div>
      </Scroller>
    </Plane>
  );
}
