import {
  BookTextIcon,
  EllipsisIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Virtuoso } from "react-virtuoso";
import { Link, useLocation } from "wouter";
import {
  useDeleteDeck,
  useDuplicateDeck,
} from "@/components/deck-display/hooks";
import {
  DeckSummary,
  DeckSummaryQuickActions,
} from "@/components/deck-summary/deck-summary";
import { Button } from "@/components/ui/button";
import {
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Scroller } from "@/components/ui/scroller";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import { selectConnectionsData } from "@/store/selectors/connections";
import { selectDecksDisplayList } from "@/store/selectors/deck-collection";
import { isEmpty } from "@/utils/is-empty";
import { useHotkey } from "@/utils/use-hotkey";
import { FileInput } from "../ui/file-input";
import css from "./deck-collection.module.css";
import { DeckCollectionFilters } from "./deck-collection-filters";
import { DeckCollectionFolder } from "./deck-collection-folder";
import { DeckCollectionImport } from "./deck-collection-import";

export function DeckCollection() {
  const { t } = useTranslation();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [scrollParent, setScrollParent] = useState<HTMLElement | undefined>();

  const [, navigate] = useLocation();
  const toast = useToast();

  const deckCollection = useStore(selectDecksDisplayList);
  const hasConnections = !isEmpty(useStore(selectConnectionsData));

  const importDecks = useStore((state) => state.importFromFiles);
  const deleteAllDecks = useStore((state) => state.deleteAllDecks);

  const onAddFiles = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const files = evt.target.files;
      if (files?.length) {
        importDecks(files);
        setPopoverOpen(false);
      }
    },
    [importDecks],
  );

  const onDeleteAll = useCallback(async () => {
    const confirmed = confirm(t("deck_collection.delete_all_confirm"));

    if (confirmed) {
      setPopoverOpen(false);

      const toastId = toast.show({
        children: t("deck_collection.delete_all_loading"),
        variant: "loading",
      });
      try {
        await deleteAllDecks();
        toast.dismiss(toastId);
        toast.show({
          children: t("deck_collection.delete_all_success"),
          duration: 3000,
          variant: "success",
        });
      } catch (err) {
        toast.dismiss(toastId);
        toast.show({
          children: t("deck_collection.delete_all_error", {
            error: (err as Error)?.message,
          }),
          variant: "error",
        });
      }
    }
  }, [deleteAllDecks, toast, t]);

  const deleteDeck = useDeleteDeck();
  const duplicateDeck = useDuplicateDeck();

  const onNewDeck = useCallback(() => {
    navigate("/deck/create");
  }, [navigate]);

  useHotkey("n", onNewDeck);

  return (
    <div className={css["container"]}>
      <header className={css["header"]}>
        <h2 className={css["title"]}>{t("deck_collection.title")}</h2>
        <div className={css["actions"]}>
          {!hasConnections && (
            <Popover>
              <DeckCollectionImport />
            </Popover>
          )}
          <Link to="/decklists" asChild>
            <Button as="a" data-testid="collection-deck-guides" size="sm">
              <BookTextIcon />
              {t("decklists.browse.title")}
            </Button>
          </Link>
          <Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="bare"
                data-testid="collection-more-actions"
                tooltip={t("common.more_actions")}
              >
                <EllipsisIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <DropdownMenu>
                <DropdownItem>
                  <FileInput
                    accept="application/json"
                    id="collection-import"
                    multiple
                    onChange={onAddFiles}
                    size="full"
                    variant="bare"
                  >
                    <UploadIcon /> {t("deck_collection.import_json")}
                  </FileInput>
                </DropdownItem>
                <DropdownButton
                  data-testid="collection-delete-all"
                  onClick={onDeleteAll}
                  size="full"
                  variant="bare"
                >
                  <Trash2Icon /> {t("deck_collection.delete_all")}
                </DropdownButton>
              </DropdownMenu>
            </PopoverContent>
          </Popover>
        </div>
      </header>
      <div className={css["cta"]}>
        <Link asChild to="/deck/create">
          <Button as="a" data-testid="collection-create-deck" size="sm">
            <PlusIcon />
            {t("deck.actions.create")}
          </Button>
        </Link>
      </div>

      {deckCollection.total > 1 && (
        <div className={css["filters"]}>
          <DeckCollectionFilters
            filteredCount={deckCollection.deckCount}
            totalCount={deckCollection.total}
          />
        </div>
      )}
      {deckCollection.total ? (
        <Scroller
          className={css["scroller"]}
          ref={setScrollParent as unknown as React.RefObject<HTMLDivElement>}
          type="hover"
        >
          <Virtuoso
            customScrollParent={scrollParent}
            data={deckCollection.entries}
            overscan={5}
            totalCount={deckCollection.total}
            skipAnimationFrameInResizeObserver
            itemContent={(_, entry) => (
              <div
                key={entry.type === "deck" ? entry.deck.id : entry.folder.id}
                className={css["collection-entry"]}
                style={
                  {
                    "--depth": entry.depth,
                    "--folder-color": entry.folder?.color,
                  } as React.CSSProperties
                }
              >
                {entry.type === "folder" && (
                  <DeckCollectionFolder
                    count={entry.count}
                    expanded={entry.expanded}
                    folder={entry.folder}
                  />
                )}
                {entry.type === "deck" && (
                  <div
                    className={css["deck"]}
                    data-testid={`collection-deck-${entry.deck.name}`}
                    style={{ "--depth": entry.depth } as React.CSSProperties}
                  >
                    <DeckSummary
                      data-testid="collection-deck"
                      deck={entry.deck}
                      interactive
                      showThumbnail
                      size="sm"
                      validation={entry.deck.problem}
                    >
                      <DeckSummaryQuickActions
                        deck={entry.deck}
                        onDeleteDeck={deleteDeck}
                        onDuplicateDeck={duplicateDeck}
                      />
                    </DeckSummary>
                  </div>
                )}
              </div>
            )}
          />
        </Scroller>
      ) : (
        <div className={css["placeholder-container"]}>
          <figure className={css["placeholder"]}>
            <i className="icon-deck" />
            <figcaption className={css["placeholder-caption"]}>
              {t("deck_collection.collection_empty")}
              <nav className={css["placeholder-actions"]}>
                <Link href="/deck/create" asChild>
                  <Button variant="bare">
                    <PlusIcon />
                    {t("deck.actions.create")}
                  </Button>
                </Link>
                <Link href="/settings" asChild>
                  <Button variant="bare">
                    <i className="icon-elder_sign" />
                    {t("deck_collection.connect_arkhamdb")}
                  </Button>
                </Link>
              </nav>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
