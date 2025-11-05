import { MegaphoneIcon, XIcon } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { DeckCollection } from "@/components/deck-collection/deck-collection";
import { Filters } from "@/components/filters/filters";
import { Button } from "@/components/ui/button";
import { ListLayout } from "@/layouts/list-layout";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { useDocumentTitle } from "@/utils/use-document-title";
import css from "./browse.module.css";

function Browse() {
  const { t } = useTranslation();

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);
  useDocumentTitle(t("browse.title"));

  const setActiveList = useStore((state) => state.setActiveList);

  useEffect(() => {
    setActiveList("browse");
  }, [setActiveList]);

  if (!isInitalized || !activeListId?.startsWith("browse")) return null;

  return (
    <CardModalProvider>
      <ListLayoutContextProvider>
        <ListLayout
          filters={<Filters targetDeck={undefined} />}
          sidebar={<DeckCollection />}
          sidebarWidthMax="var(--sidebar-width-one-col)"
        >
          {(props) => <CardListContainer {...props} />}
        </ListLayout>
      </ListLayoutContextProvider>
      <PreviewBanner />
    </CardModalProvider>
  );
}

function PreviewBanner() {
  const seen = useStore(
    (state) => state.settings.flags?.["seen-core-2026-reveal"],
  );

  const toggleFlag = useStore((state) => state.toggleFlag);

  if (seen) return null;

  return (
    <div className={cx(css["banner"], "background-seeker")}>
      <MegaphoneIcon />
      <p>
        Check out <Link to="~/blog/core-2026-reveal">our reveal</Link> for this
        year's preview season and grab a souvenir.
      </p>
      <Button
        iconOnly
        variant="bare"
        onClick={() => toggleFlag("seen-core-2026-reveal")}
        size="sm"
      >
        <XIcon />
      </Button>
    </div>
  );
}

export default Browse;
