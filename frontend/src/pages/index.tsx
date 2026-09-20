import { DeckSchema, type Deck } from "@arkham-build/shared";
import { MegaphoneIcon, XIcon } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CardListContainer } from "@/components/card-list/card-list-container";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { DeckCollection } from "@/components/deck-collection/deck-collection";
import { Filters } from "@/components/filters/filters";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { useToast } from "@/components/ui/toast.hooks";
import { ListLayout } from "@/layouts/list-layout";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { useImportDecksMutation } from "@/queries/mutations/decks";
import { useStore } from "@/store";
import { selectIsInitialized } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { RandomCardButton } from "./index/random-card-button";
import css from "./index.module.css";

function Index() {
  const { t } = useTranslation();

  usePasteDeckImport();

  const activeListId = useStore((state) => state.activeList);
  const isInitalized = useStore(selectIsInitialized);
  const setActiveList = useStore((state) => state.setActiveList);

  useEffect(() => {
    setActiveList("index");
  }, [setActiveList]);

  if (!isInitalized || !activeListId?.startsWith("index")) return null;

  return (
    <CardModalProvider>
      <PageTitle>{t("browse.title")}</PageTitle>
      <ListLayoutContextProvider>
        <ListLayout
          filters={<Filters targetDeck={undefined} />}
          mastheadNav={<RandomCardButton />}
          sidebar={<DeckCollection />}
          sidebarWidthMax="var(--sidebar-width-one-col)"
        >
          {(props) => <CardListContainer {...props} />}
        </ListLayout>
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

function usePasteDeckImport() {
  const { t } = useTranslation();
  const toast = useToast();
  const { mutate: importDecks } = useImportDecksMutation();

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if (pasteTargetIsEditable(event)) return;

      const deck = parsePastedDeck(
        event.clipboardData?.getData("text/plain") ?? "",
      );
      if (!deck) return;

      event.preventDefault();
      importDecks([deck], {
        onError(error) {
          toast.show({
            children: t("deck_collection.import_error", {
              error: error instanceof Error ? error.message : "Unknown error",
            }),
            variant: "error",
          });
        },
      });
    }

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [importDecks, t, toast]);
}

function pasteTargetIsEditable(event: ClipboardEvent) {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable),
    );
}

function parsePastedDeck(text: string): Deck | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    const result = DeckSchema.safeParse(parsed);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

// oxlint-disable-next-line no-unused-vars -- unused
function PreviewBanner() {
  const seen = useStore(
    (state) => state.settings.flags?.["seen-core-2026-val-reveal"],
  );

  const toggleFlag = useStore((state) => state.toggleFlag);
  if (seen) return null;

  return (
    <div className={cx(css["banner"], "background-mystic")}>
      <MegaphoneIcon />
      <p>
        Check out{" "}
        <a
          href="https://arkham.build/deck/view/mythYWGvtWuSfhh"
          target="_blank"
          rel="noreferrer"
          onClick={() => toggleFlag("seen-core-2026-val-reveal")}
        >
          Valentin1331's <i className="icon-mystic" /> reveal
        </a>{" "}
        for this year's preview season.
      </p>
      <Button
        iconOnly
        variant="bare"
        onClick={() => toggleFlag("seen-core-2026-val-reveal")}
        size="sm"
      >
        <XIcon />
      </Button>
    </div>
  );
}

export default Index;
